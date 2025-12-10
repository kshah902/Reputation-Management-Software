import { google, mybusinessaccountmanagement_v1, mybusinessbusinessinformation_v1 } from 'googleapis';
import { prisma } from '../config/database';
import { config } from '../config';
import { logger } from '../utils/logger';

interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

interface BusinessProfileData {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  website?: string;
  primaryCategory?: string;
  categories?: string[];
  description?: string;
  hours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
}

interface ReviewData {
  reviewId: string;
  reviewerName: string;
  reviewerPhotoUrl?: string;
  rating: number;
  comment?: string;
  publishedAt: Date;
  updateTime?: Date;
  replyComment?: string;
  replyTime?: Date;
}

export class GoogleBusinessProfileService {
  private oauth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      config.GOOGLE_REDIRECT_URI
    );
  }

  getAuthUrl(state: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/business.manage',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      state,
    });
  }

  async exchangeCode(code: string): Promise<GoogleTokens> {
    const { tokens } = await this.oauth2Client.getToken(code);

    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      expiresAt: new Date(tokens.expiry_date!),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.oauth2Client.refreshAccessToken();

    return {
      accessToken: credentials.access_token!,
      refreshToken: refreshToken,
      expiresAt: new Date(credentials.expiry_date!),
    };
  }

  private setCredentials(accessToken: string, refreshToken: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  async getAccounts(accessToken: string, refreshToken: string): Promise<any[]> {
    this.setCredentials(accessToken, refreshToken);

    const accountManagement = google.mybusinessaccountmanagement({
      version: 'v1',
      auth: this.oauth2Client,
    });

    try {
      const response = await accountManagement.accounts.list();
      return response.data.accounts || [];
    } catch (error) {
      logger.error('Failed to fetch Google accounts:', error);
      throw error;
    }
  }

  async getLocations(
    accessToken: string,
    refreshToken: string,
    accountId: string
  ): Promise<any[]> {
    this.setCredentials(accessToken, refreshToken);

    const businessInformation = google.mybusinessbusinessinformation({
      version: 'v1',
      auth: this.oauth2Client,
    });

    try {
      const response = await businessInformation.accounts.locations.list({
        parent: accountId,
        readMask: 'name,title,storefrontAddress,phoneNumbers,websiteUri,regularHours,categories',
      });
      return response.data.locations || [];
    } catch (error) {
      logger.error('Failed to fetch Google locations:', error);
      throw error;
    }
  }

  async getLocationDetails(
    accessToken: string,
    refreshToken: string,
    locationName: string
  ): Promise<BusinessProfileData | null> {
    this.setCredentials(accessToken, refreshToken);

    const businessInformation = google.mybusinessbusinessinformation({
      version: 'v1',
      auth: this.oauth2Client,
    });

    try {
      const response = await businessInformation.locations.get({
        name: locationName,
        readMask: 'name,title,storefrontAddress,phoneNumbers,websiteUri,regularHours,categories,profile',
      });

      const location = response.data;

      return {
        name: location.title || '',
        address: location.storefrontAddress?.addressLines?.join(', '),
        city: location.storefrontAddress?.locality,
        state: location.storefrontAddress?.administrativeArea,
        zipCode: location.storefrontAddress?.postalCode,
        country: location.storefrontAddress?.regionCode,
        phone: location.phoneNumbers?.primaryPhone,
        website: location.websiteUri,
        primaryCategory: location.categories?.primaryCategory?.displayName,
        categories: location.categories?.additionalCategories?.map((c) => c.displayName || '') || [],
        description: location.profile?.description,
        hours: this.parseHours(location.regularHours),
      };
    } catch (error) {
      logger.error('Failed to fetch location details:', error);
      return null;
    }
  }

  async getReviews(
    accessToken: string,
    refreshToken: string,
    accountId: string,
    locationId: string,
    pageToken?: string
  ): Promise<{ reviews: ReviewData[]; nextPageToken?: string }> {
    this.setCredentials(accessToken, refreshToken);

    // Using the My Business Account Management API for reviews
    // Note: The actual API endpoint depends on your Google Cloud setup
    try {
      const response = await fetch(
        `https://mybusiness.googleapis.com/v4/${accountId}/${locationId}/reviews${
          pageToken ? `?pageToken=${pageToken}` : ''
        }`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        logger.error('Failed to fetch reviews:', error);
        throw new Error('Failed to fetch reviews');
      }

      const data = await response.json();

      const reviews: ReviewData[] = (data.reviews || []).map((review: any) => ({
        reviewId: review.reviewId,
        reviewerName: review.reviewer?.displayName || 'Anonymous',
        reviewerPhotoUrl: review.reviewer?.profilePhotoUrl,
        rating: this.starRatingToNumber(review.starRating),
        comment: review.comment,
        publishedAt: new Date(review.createTime),
        updateTime: review.updateTime ? new Date(review.updateTime) : undefined,
        replyComment: review.reviewReply?.comment,
        replyTime: review.reviewReply?.updateTime
          ? new Date(review.reviewReply.updateTime)
          : undefined,
      }));

      return {
        reviews,
        nextPageToken: data.nextPageToken,
      };
    } catch (error) {
      logger.error('Failed to fetch reviews:', error);
      return { reviews: [] };
    }
  }

  async replyToReview(
    accessToken: string,
    refreshToken: string,
    reviewName: string,
    comment: string
  ): Promise<boolean> {
    this.setCredentials(accessToken, refreshToken);

    try {
      const response = await fetch(
        `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ comment }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        logger.error('Failed to reply to review:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to reply to review:', error);
      return false;
    }
  }

  generateReviewLink(placeId: string): string {
    return `https://search.google.com/local/writereview?placeid=${placeId}`;
  }

  private parseHours(regularHours: any): BusinessProfileData['hours'] {
    if (!regularHours?.periods) return undefined;

    const hours: BusinessProfileData['hours'] = {};
    const dayMap: Record<string, keyof NonNullable<BusinessProfileData['hours']>> = {
      MONDAY: 'monday',
      TUESDAY: 'tuesday',
      WEDNESDAY: 'wednesday',
      THURSDAY: 'thursday',
      FRIDAY: 'friday',
      SATURDAY: 'saturday',
      SUNDAY: 'sunday',
    };

    for (const period of regularHours.periods) {
      const day = dayMap[period.openDay];
      if (day) {
        const open = period.openTime ? `${period.openTime.hours}:${period.openTime.minutes || '00'}` : '';
        const close = period.closeTime ? `${period.closeTime.hours}:${period.closeTime.minutes || '00'}` : '';
        hours[day] = `${open} - ${close}`;
      }
    }

    return hours;
  }

  private starRatingToNumber(starRating: string): number {
    const ratingMap: Record<string, number> = {
      ONE: 1,
      TWO: 2,
      THREE: 3,
      FOUR: 4,
      FIVE: 5,
    };
    return ratingMap[starRating] || 0;
  }

  async syncBusinessProfile(businessProfileId: string): Promise<void> {
    const profile = await prisma.businessProfile.findUnique({
      where: { id: businessProfileId },
    });

    if (!profile || !profile.googleAccessToken || !profile.googleRefreshToken) {
      logger.warn(`Cannot sync profile ${businessProfileId}: missing credentials`);
      return;
    }

    // Check if token needs refresh
    let accessToken = profile.googleAccessToken;
    if (profile.tokenExpiresAt && profile.tokenExpiresAt < new Date()) {
      const newTokens = await this.refreshAccessToken(profile.googleRefreshToken);
      accessToken = newTokens.accessToken;

      await prisma.businessProfile.update({
        where: { id: businessProfileId },
        data: {
          googleAccessToken: newTokens.accessToken,
          tokenExpiresAt: newTokens.expiresAt,
        },
      });
    }

    // Fetch and sync reviews
    if (profile.googleAccountId && profile.googleLocationId) {
      await this.syncReviews(
        profile.id,
        profile.clientId,
        accessToken,
        profile.googleRefreshToken,
        profile.googleAccountId,
        profile.googleLocationId
      );
    }
  }

  private async syncReviews(
    businessProfileId: string,
    clientId: string,
    accessToken: string,
    refreshToken: string,
    accountId: string,
    locationId: string
  ): Promise<void> {
    let pageToken: string | undefined;

    do {
      const { reviews, nextPageToken } = await this.getReviews(
        accessToken,
        refreshToken,
        accountId,
        locationId,
        pageToken
      );

      for (const review of reviews) {
        await prisma.review.upsert({
          where: { externalId: review.reviewId },
          create: {
            clientId,
            businessProfileId,
            platform: 'google',
            externalId: review.reviewId,
            reviewerName: review.reviewerName,
            reviewerPhotoUrl: review.reviewerPhotoUrl,
            rating: review.rating,
            comment: review.comment,
            publishedAt: review.publishedAt,
            needsResponse: !review.replyComment,
            isResponded: !!review.replyComment,
          },
          update: {
            rating: review.rating,
            comment: review.comment,
            needsResponse: !review.replyComment,
            isResponded: !!review.replyComment,
          },
        });
      }

      pageToken = nextPageToken;
    } while (pageToken);

    // Update profile sync timestamp
    await prisma.businessProfile.update({
      where: { id: businessProfileId },
      data: { lastSyncedAt: new Date() },
    });
  }
}

export const googleBusinessProfileService = new GoogleBusinessProfileService();
