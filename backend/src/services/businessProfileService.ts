import { prisma } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { googleBusinessProfileService } from '../integrations/googleBusinessProfile';
import { generateShortCode } from '../utils/helpers';
import { config } from '../config';
import { PhotoType, PostType, PostStatus } from '@prisma/client';

interface CreateBusinessProfileInput {
  clientId: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  website?: string;
  email?: string;
  description?: string;
  primaryCategory?: string;
  categories?: string[];
  googlePlaceId?: string;
}

interface UpdateBusinessProfileInput {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  website?: string;
  email?: string;
  description?: string;
  primaryCategory?: string;
  categories?: string[];
  mondayHours?: string;
  tuesdayHours?: string;
  wednesdayHours?: string;
  thursdayHours?: string;
  fridayHours?: string;
  saturdayHours?: string;
  sundayHours?: string;
}

export class BusinessProfileService {
  async create(input: CreateBusinessProfileInput) {
    const profile = await prisma.businessProfile.create({
      data: {
        clientId: input.clientId,
        name: input.name,
        address: input.address,
        city: input.city,
        state: input.state,
        zipCode: input.zipCode,
        country: input.country,
        phone: input.phone,
        website: input.website,
        email: input.email,
        description: input.description,
        primaryCategory: input.primaryCategory,
        categories: input.categories || [],
        googlePlaceId: input.googlePlaceId,
      },
    });

    // Create review link if we have a Google Place ID
    if (input.googlePlaceId) {
      const reviewUrl = googleBusinessProfileService.generateReviewLink(input.googlePlaceId);
      await this.createReviewLink(profile.id, reviewUrl);
    }

    return profile;
  }

  async update(id: string, clientId: string, input: UpdateBusinessProfileInput) {
    const profile = await prisma.businessProfile.findFirst({
      where: { id, clientId },
    });

    if (!profile) {
      throw new NotFoundError('Business Profile');
    }

    return prisma.businessProfile.update({
      where: { id },
      data: input,
    });
  }

  async delete(id: string, clientId: string) {
    const profile = await prisma.businessProfile.findFirst({
      where: { id, clientId },
    });

    if (!profile) {
      throw new NotFoundError('Business Profile');
    }

    await prisma.businessProfile.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getById(id: string, clientId: string) {
    const profile = await prisma.businessProfile.findFirst({
      where: { id, clientId },
      include: {
        reviewLinks: { where: { isActive: true } },
        directoryListings: true,
        _count: {
          select: { reviews: true },
        },
      },
    });

    if (!profile) {
      throw new NotFoundError('Business Profile');
    }

    return profile;
  }

  async list(clientId: string, page = 1, limit = 20) {
    const where = { clientId, isActive: true };

    const [profiles, total] = await Promise.all([
      prisma.businessProfile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          reviewLinks: { where: { isActive: true }, take: 1 },
          _count: {
            select: { reviews: true },
          },
        },
      }),
      prisma.businessProfile.count({ where }),
    ]);

    return {
      profiles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async connectGoogle(clientId: string, profileId: string, code: string) {
    const profile = await prisma.businessProfile.findFirst({
      where: { id: profileId, clientId },
    });

    if (!profile) {
      throw new NotFoundError('Business Profile');
    }

    const tokens = await googleBusinessProfileService.exchangeCode(code);

    await prisma.businessProfile.update({
      where: { id: profileId },
      data: {
        googleAccessToken: tokens.accessToken,
        googleRefreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
      },
    });

    return { success: true };
  }

  async getGoogleAccounts(profileId: string) {
    const profile = await prisma.businessProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile || !profile.googleAccessToken || !profile.googleRefreshToken) {
      throw new ValidationError({ google: ['Google not connected'] });
    }

    return googleBusinessProfileService.getAccounts(
      profile.googleAccessToken,
      profile.googleRefreshToken
    );
  }

  async getGoogleLocations(profileId: string, accountId: string) {
    const profile = await prisma.businessProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile || !profile.googleAccessToken || !profile.googleRefreshToken) {
      throw new ValidationError({ google: ['Google not connected'] });
    }

    return googleBusinessProfileService.getLocations(
      profile.googleAccessToken,
      profile.googleRefreshToken,
      accountId
    );
  }

  async selectGoogleLocation(profileId: string, accountId: string, locationId: string) {
    const profile = await prisma.businessProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile || !profile.googleAccessToken || !profile.googleRefreshToken) {
      throw new ValidationError({ google: ['Google not connected'] });
    }

    // Fetch location details
    const details = await googleBusinessProfileService.getLocationDetails(
      profile.googleAccessToken,
      profile.googleRefreshToken,
      locationId
    );

    // Update profile with location data
    await prisma.businessProfile.update({
      where: { id: profileId },
      data: {
        googleAccountId: accountId,
        googleLocationId: locationId,
        ...(details && {
          name: details.name,
          address: details.address,
          city: details.city,
          state: details.state,
          zipCode: details.zipCode,
          country: details.country,
          phone: details.phone,
          website: details.website,
          primaryCategory: details.primaryCategory,
          categories: details.categories || [],
          description: details.description,
          mondayHours: details.hours?.monday,
          tuesdayHours: details.hours?.tuesday,
          wednesdayHours: details.hours?.wednesday,
          thursdayHours: details.hours?.thursday,
          fridayHours: details.hours?.friday,
          saturdayHours: details.hours?.saturday,
          sundayHours: details.hours?.sunday,
          isVerified: true,
        }),
      },
    });

    return { success: true };
  }

  async createReviewLink(businessProfileId: string, fullUrl: string) {
    const shortCode = generateShortCode(8);

    return prisma.reviewLink.create({
      data: {
        businessProfileId,
        platform: 'google',
        fullUrl,
        shortUrl: `${config.API_URL}/r/${shortCode}`,
      },
    });
  }

  async getReviewLinkByShortCode(shortCode: string) {
    const shortUrl = `${config.API_URL}/r/${shortCode}`;

    const link = await prisma.reviewLink.findFirst({
      where: { shortUrl, isActive: true },
    });

    if (!link) {
      throw new NotFoundError('Review Link');
    }

    // Increment click count
    await prisma.reviewLink.update({
      where: { id: link.id },
      data: { clickCount: { increment: 1 } },
    });

    return link;
  }

  async syncWithGoogle(profileId: string) {
    await googleBusinessProfileService.syncBusinessProfile(profileId);
    return { success: true };
  }

  getGoogleAuthUrl(state: string) {
    return googleBusinessProfileService.getAuthUrl(state);
  }

  // Photos management
  async getPhotos(profileId: string, clientId: string) {
    const profile = await prisma.businessProfile.findFirst({
      where: { id: profileId, clientId },
    });

    if (!profile) {
      throw new NotFoundError('Business Profile');
    }

    const photos = await prisma.businessPhoto.findMany({
      where: { businessProfileId: profileId },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    });

    // Group photos by type
    const photosByType = photos.reduce((acc, photo) => {
      const type = photo.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(photo);
      return acc;
    }, {} as Record<PhotoType, typeof photos>);

    return {
      photos,
      photosByType,
      total: photos.length,
    };
  }

  async addPhoto(
    profileId: string,
    clientId: string,
    data: { type: PhotoType; url: string; thumbnailUrl?: string; caption?: string }
  ) {
    const profile = await prisma.businessProfile.findFirst({
      where: { id: profileId, clientId },
    });

    if (!profile) {
      throw new NotFoundError('Business Profile');
    }

    // If adding logo or cover, update profile directly
    if (data.type === 'LOGO') {
      await prisma.businessProfile.update({
        where: { id: profileId },
        data: { logoUrl: data.url },
      });
    } else if (data.type === 'COVER') {
      await prisma.businessProfile.update({
        where: { id: profileId },
        data: { coverPhotoUrl: data.url },
      });
    }

    const photo = await prisma.businessPhoto.create({
      data: {
        businessProfileId: profileId,
        type: data.type,
        url: data.url,
        thumbnailUrl: data.thumbnailUrl,
        caption: data.caption,
      },
    });

    return photo;
  }

  async updatePhoto(
    profileId: string,
    photoId: string,
    clientId: string,
    data: { type?: PhotoType; caption?: string }
  ) {
    const profile = await prisma.businessProfile.findFirst({
      where: { id: profileId, clientId },
    });

    if (!profile) {
      throw new NotFoundError('Business Profile');
    }

    const photo = await prisma.businessPhoto.findFirst({
      where: { id: photoId, businessProfileId: profileId },
    });

    if (!photo) {
      throw new NotFoundError('Photo');
    }

    return prisma.businessPhoto.update({
      where: { id: photoId },
      data,
    });
  }

  async deletePhoto(profileId: string, photoId: string, clientId: string) {
    const profile = await prisma.businessProfile.findFirst({
      where: { id: profileId, clientId },
    });

    if (!profile) {
      throw new NotFoundError('Business Profile');
    }

    const photo = await prisma.businessPhoto.findFirst({
      where: { id: photoId, businessProfileId: profileId },
    });

    if (!photo) {
      throw new NotFoundError('Photo');
    }

    await prisma.businessPhoto.delete({
      where: { id: photoId },
    });
  }

  // Posts management
  async getPosts(profileId: string, clientId: string, status?: PostStatus) {
    const profile = await prisma.businessProfile.findFirst({
      where: { id: profileId, clientId },
    });

    if (!profile) {
      throw new NotFoundError('Business Profile');
    }

    const where: any = { businessProfileId: profileId };
    if (status) {
      where.status = status;
    }

    const posts = await prisma.businessPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return posts;
  }

  async createPost(
    profileId: string,
    clientId: string,
    data: {
      type: PostType;
      title?: string;
      summary: string;
      callToAction?: string;
      callToActionUrl?: string;
      mediaUrls?: string[];
      eventStartDate?: string;
      eventEndDate?: string;
      offerCode?: string;
      offerTerms?: string;
      status?: PostStatus;
    }
  ) {
    const profile = await prisma.businessProfile.findFirst({
      where: { id: profileId, clientId },
    });

    if (!profile) {
      throw new NotFoundError('Business Profile');
    }

    const post = await prisma.businessPost.create({
      data: {
        businessProfileId: profileId,
        type: data.type,
        title: data.title,
        summary: data.summary,
        callToAction: data.callToAction,
        callToActionUrl: data.callToActionUrl || null,
        mediaUrls: data.mediaUrls || [],
        eventStartDate: data.eventStartDate ? new Date(data.eventStartDate) : null,
        eventEndDate: data.eventEndDate ? new Date(data.eventEndDate) : null,
        offerCode: data.offerCode,
        offerTerms: data.offerTerms,
        status: data.status || PostStatus.DRAFT,
      },
    });

    return post;
  }

  async updatePost(
    profileId: string,
    postId: string,
    clientId: string,
    data: Partial<{
      type: PostType;
      title: string;
      summary: string;
      callToAction: string;
      callToActionUrl: string;
      mediaUrls: string[];
      eventStartDate: string;
      eventEndDate: string;
      offerCode: string;
      offerTerms: string;
      status: PostStatus;
    }>
  ) {
    const profile = await prisma.businessProfile.findFirst({
      where: { id: profileId, clientId },
    });

    if (!profile) {
      throw new NotFoundError('Business Profile');
    }

    const post = await prisma.businessPost.findFirst({
      where: { id: postId, businessProfileId: profileId },
    });

    if (!post) {
      throw new NotFoundError('Post');
    }

    const updateData: any = { ...data };
    if (data.eventStartDate) {
      updateData.eventStartDate = new Date(data.eventStartDate);
    }
    if (data.eventEndDate) {
      updateData.eventEndDate = new Date(data.eventEndDate);
    }

    return prisma.businessPost.update({
      where: { id: postId },
      data: updateData,
    });
  }

  async deletePost(profileId: string, postId: string, clientId: string) {
    const profile = await prisma.businessProfile.findFirst({
      where: { id: profileId, clientId },
    });

    if (!profile) {
      throw new NotFoundError('Business Profile');
    }

    const post = await prisma.businessPost.findFirst({
      where: { id: postId, businessProfileId: profileId },
    });

    if (!post) {
      throw new NotFoundError('Post');
    }

    await prisma.businessPost.delete({
      where: { id: postId },
    });
  }

  async publishPost(profileId: string, postId: string, clientId: string) {
    const profile = await prisma.businessProfile.findFirst({
      where: { id: profileId, clientId },
    });

    if (!profile) {
      throw new NotFoundError('Business Profile');
    }

    const post = await prisma.businessPost.findFirst({
      where: { id: postId, businessProfileId: profileId },
    });

    if (!post) {
      throw new NotFoundError('Post');
    }

    // TODO: If Google is connected, publish to Google Business Profile
    // await googleBusinessProfileService.publishPost(profile, post);

    return prisma.businessPost.update({
      where: { id: postId },
      data: {
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }

  // Hours management
  async updateHours(
    profileId: string,
    clientId: string,
    data: {
      mondayHours?: string | null;
      tuesdayHours?: string | null;
      wednesdayHours?: string | null;
      thursdayHours?: string | null;
      fridayHours?: string | null;
      saturdayHours?: string | null;
      sundayHours?: string | null;
      specialHours?: any;
    }
  ) {
    const profile = await prisma.businessProfile.findFirst({
      where: { id: profileId, clientId },
    });

    if (!profile) {
      throw new NotFoundError('Business Profile');
    }

    return prisma.businessProfile.update({
      where: { id: profileId },
      data,
    });
  }
}

export const businessProfileService = new BusinessProfileService();
