import prisma from '../config/database';
import { DirectoryType, SyncStatus } from '@prisma/client';
import { NotFoundError } from '../utils/errors';

// List of popular business directories for SEO
const DIRECTORY_INFO: Record<DirectoryType, {
  name: string;
  url: string;
  description: string;
  priority: number; // 1 = highest priority
  claimUrl?: string;
}> = {
  GOOGLE: {
    name: 'Google Business Profile',
    url: 'https://business.google.com',
    description: 'Essential for local SEO and Google Maps visibility',
    priority: 1,
  },
  YELP: {
    name: 'Yelp',
    url: 'https://biz.yelp.com',
    description: 'Major review platform, especially for restaurants and services',
    priority: 2,
    claimUrl: 'https://biz.yelp.com/claim',
  },
  FACEBOOK: {
    name: 'Facebook Business',
    url: 'https://business.facebook.com',
    description: 'Social media presence and reviews',
    priority: 2,
  },
  BING: {
    name: 'Bing Places',
    url: 'https://www.bingplaces.com',
    description: 'Microsoft search engine listings',
    priority: 3,
    claimUrl: 'https://www.bingplaces.com/Dashboard/AddBusiness',
  },
  APPLE_MAPS: {
    name: 'Apple Business Connect',
    url: 'https://businessconnect.apple.com',
    description: 'Apple Maps and Siri visibility',
    priority: 3,
    claimUrl: 'https://mapsconnect.apple.com',
  },
  YELLOWPAGES: {
    name: 'Yellow Pages',
    url: 'https://www.yellowpages.com',
    description: 'Classic business directory',
    priority: 4,
    claimUrl: 'https://adsolutions.yp.com/free-listings',
  },
  BBB: {
    name: 'Better Business Bureau',
    url: 'https://www.bbb.org',
    description: 'Trust and accreditation',
    priority: 4,
    claimUrl: 'https://www.bbb.org/get-listed',
  },
  TRIPADVISOR: {
    name: 'TripAdvisor',
    url: 'https://www.tripadvisor.com',
    description: 'Travel and hospitality reviews',
    priority: 3,
    claimUrl: 'https://www.tripadvisor.com/Owners',
  },
  FOURSQUARE: {
    name: 'Foursquare',
    url: 'https://foursquare.com',
    description: 'Location data platform',
    priority: 5,
    claimUrl: 'https://business.foursquare.com',
  },
  HEALTHGRADES: {
    name: 'Healthgrades',
    url: 'https://www.healthgrades.com',
    description: 'Healthcare provider directory',
    priority: 3,
  },
  ZOCDOC: {
    name: 'Zocdoc',
    url: 'https://www.zocdoc.com',
    description: 'Healthcare appointment booking',
    priority: 3,
  },
  NEXTDOOR: {
    name: 'Nextdoor',
    url: 'https://nextdoor.com',
    description: 'Neighborhood recommendations',
    priority: 4,
    claimUrl: 'https://business.nextdoor.com',
  },
  ANGIESLIST: {
    name: "Angi (Angie's List)",
    url: 'https://www.angi.com',
    description: 'Home services reviews',
    priority: 4,
  },
  THUMBTACK: {
    name: 'Thumbtack',
    url: 'https://www.thumbtack.com',
    description: 'Service professional marketplace',
    priority: 4,
  },
  HOMEADVISOR: {
    name: 'HomeAdvisor',
    url: 'https://www.homeadvisor.com',
    description: 'Home services marketplace',
    priority: 4,
  },
  HOTFROG: {
    name: 'Hotfrog',
    url: 'https://www.hotfrog.com',
    description: 'Small business directory',
    priority: 6,
  },
  MANTA: {
    name: 'Manta',
    url: 'https://www.manta.com',
    description: 'Small business directory',
    priority: 5,
  },
  CITYSEARCH: {
    name: 'CitySearch',
    url: 'https://www.citysearch.com',
    description: 'Local business directory',
    priority: 6,
  },
  SUPERPAGES: {
    name: 'Superpages',
    url: 'https://www.superpages.com',
    description: 'Business listings directory',
    priority: 5,
  },
  DEXKNOWS: {
    name: 'DexKnows',
    url: 'https://www.dexknows.com',
    description: 'Local business search',
    priority: 6,
  },
  MAPQUEST: {
    name: 'MapQuest',
    url: 'https://www.mapquest.com',
    description: 'Maps and business listings',
    priority: 5,
  },
  YAHOO_LOCAL: {
    name: 'Yahoo Local',
    url: 'https://local.yahoo.com',
    description: 'Yahoo business listings',
    priority: 5,
  },
  INSTAGRAM: {
    name: 'Instagram Business',
    url: 'https://business.instagram.com',
    description: 'Visual social media presence',
    priority: 3,
  },
  LINKEDIN: {
    name: 'LinkedIn Company Page',
    url: 'https://www.linkedin.com',
    description: 'Professional network presence',
    priority: 4,
  },
  TWITTER: {
    name: 'X (Twitter) Business',
    url: 'https://business.twitter.com',
    description: 'Social media engagement',
    priority: 4,
  },
};

class DirectoryService {
  // Get all available directories
  async getAvailableDirectories() {
    return Object.entries(DIRECTORY_INFO).map(([type, info]) => ({
      type,
      ...info,
    }));
  }

  // Get directory listings for a business profile
  async getListings(businessProfileId: string, clientId: string) {
    // Verify profile belongs to client
    const profile = await prisma.businessProfile.findFirst({
      where: { id: businessProfileId, clientId },
    });

    if (!profile) {
      throw new NotFoundError('Business profile not found');
    }

    const listings = await prisma.directoryListing.findMany({
      where: { businessProfileId },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate overall consistency score
    const consistentCount = listings.filter(l => l.isConsistent).length;
    const consistencyScore = listings.length > 0
      ? Math.round((consistentCount / listings.length) * 100)
      : 0;

    // Add directory info to each listing
    const listingsWithInfo = listings.map(listing => ({
      ...listing,
      directoryInfo: DIRECTORY_INFO[listing.directory],
    }));

    // Get uncreated directories
    const existingTypes = new Set(listings.map(l => l.directory));
    const availableDirectories = Object.entries(DIRECTORY_INFO)
      .filter(([type]) => !existingTypes.has(type as DirectoryType))
      .map(([type, info]) => ({ type, ...info }));

    return {
      listings: listingsWithInfo,
      consistencyScore,
      totalListings: listings.length,
      consistentListings: consistentCount,
      availableDirectories,
    };
  }

  // Create/add a directory listing
  async createListing(
    businessProfileId: string,
    clientId: string,
    data: {
      directory: DirectoryType;
      listingUrl?: string;
      externalId?: string;
      isClaimed?: boolean;
      isVerified?: boolean;
    }
  ) {
    // Verify profile belongs to client
    const profile = await prisma.businessProfile.findFirst({
      where: { id: businessProfileId, clientId },
    });

    if (!profile) {
      throw new NotFoundError('Business profile not found');
    }

    // Copy business profile data to listing
    const listing = await prisma.directoryListing.create({
      data: {
        clientId,
        businessProfileId,
        directory: data.directory,
        listingUrl: data.listingUrl,
        externalId: data.externalId,
        isClaimed: data.isClaimed || false,
        isVerified: data.isVerified || false,
        // Copy master profile data
        name: profile.name,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        zipCode: profile.zipCode,
        phone: profile.phone,
        website: profile.website,
        email: profile.email,
        description: profile.description,
        categories: profile.categories,
        hours: profile.mondayHours ? {
          monday: profile.mondayHours,
          tuesday: profile.tuesdayHours,
          wednesday: profile.wednesdayHours,
          thursday: profile.thursdayHours,
          friday: profile.fridayHours,
          saturday: profile.saturdayHours,
          sunday: profile.sundayHours,
        } : null,
        syncStatus: SyncStatus.PENDING,
        isConsistent: true, // Starts consistent since we copied data
        claimUrl: DIRECTORY_INFO[data.directory]?.claimUrl,
      },
    });

    return listing;
  }

  // Update a directory listing
  async updateListing(
    listingId: string,
    clientId: string,
    data: Partial<{
      listingUrl: string;
      externalId: string;
      name: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      phone: string;
      website: string;
      email: string;
      description: string;
      isClaimed: boolean;
      isVerified: boolean;
      syncStatus: SyncStatus;
    }>
  ) {
    const listing = await prisma.directoryListing.findFirst({
      where: { id: listingId, clientId },
      include: { businessProfile: true },
    });

    if (!listing) {
      throw new NotFoundError('Directory listing not found');
    }

    // Check for inconsistencies with master profile
    const profile = listing.businessProfile;
    const inconsistencies: string[] = [];

    const checkFields = ['name', 'address', 'city', 'state', 'zipCode', 'phone', 'website', 'email'] as const;

    for (const field of checkFields) {
      const newValue = data[field] ?? listing[field];
      const masterValue = profile[field];

      if (newValue && masterValue && newValue !== masterValue) {
        inconsistencies.push(field);
      }
    }

    const updatedListing = await prisma.directoryListing.update({
      where: { id: listingId },
      data: {
        ...data,
        isConsistent: inconsistencies.length === 0,
        inconsistencies: inconsistencies.length > 0 ? inconsistencies : null,
        updatedAt: new Date(),
      },
    });

    return updatedListing;
  }

  // Delete a directory listing
  async deleteListing(listingId: string, clientId: string) {
    const listing = await prisma.directoryListing.findFirst({
      where: { id: listingId, clientId },
    });

    if (!listing) {
      throw new NotFoundError('Directory listing not found');
    }

    await prisma.directoryListing.delete({
      where: { id: listingId },
    });
  }

  // Sync all listings with master profile (update listing data to match master)
  async syncAllWithMaster(businessProfileId: string, clientId: string) {
    const profile = await prisma.businessProfile.findFirst({
      where: { id: businessProfileId, clientId },
    });

    if (!profile) {
      throw new NotFoundError('Business profile not found');
    }

    const masterData = {
      name: profile.name,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      zipCode: profile.zipCode,
      phone: profile.phone,
      website: profile.website,
      email: profile.email,
      description: profile.description,
      categories: profile.categories,
      hours: profile.mondayHours ? {
        monday: profile.mondayHours,
        tuesday: profile.tuesdayHours,
        wednesday: profile.wednesdayHours,
        thursday: profile.thursdayHours,
        friday: profile.fridayHours,
        saturday: profile.saturdayHours,
        sunday: profile.sundayHours,
      } : null,
      isConsistent: true,
      inconsistencies: null,
      lastSyncedAt: new Date(),
    };

    const result = await prisma.directoryListing.updateMany({
      where: { businessProfileId, clientId },
      data: masterData,
    });

    return { updatedCount: result.count };
  }

  // Check consistency of a specific listing against master
  async checkConsistency(listingId: string, clientId: string) {
    const listing = await prisma.directoryListing.findFirst({
      where: { id: listingId, clientId },
      include: { businessProfile: true },
    });

    if (!listing) {
      throw new NotFoundError('Directory listing not found');
    }

    const profile = listing.businessProfile;
    const inconsistencies: { field: string; master: string | null; listing: string | null }[] = [];

    const checkFields = ['name', 'address', 'city', 'state', 'zipCode', 'phone', 'website', 'email'] as const;

    for (const field of checkFields) {
      const listingValue = listing[field];
      const masterValue = profile[field];

      if (listingValue !== masterValue) {
        inconsistencies.push({
          field,
          master: masterValue,
          listing: listingValue,
        });
      }
    }

    // Update the listing with consistency info
    await prisma.directoryListing.update({
      where: { id: listingId },
      data: {
        isConsistent: inconsistencies.length === 0,
        inconsistencies: inconsistencies.map(i => i.field),
        lastCheckedAt: new Date(),
      },
    });

    return {
      isConsistent: inconsistencies.length === 0,
      inconsistencies,
    };
  }

  // Auto-create listings for all available directories
  async autoCreateListings(businessProfileId: string, clientId: string, directoryTypes?: DirectoryType[]) {
    const profile = await prisma.businessProfile.findFirst({
      where: { id: businessProfileId, clientId },
    });

    if (!profile) {
      throw new NotFoundError('Business profile not found');
    }

    // Get existing listings
    const existingListings = await prisma.directoryListing.findMany({
      where: { businessProfileId },
      select: { directory: true },
    });

    const existingTypes = new Set(existingListings.map(l => l.directory));

    // Determine which directories to create
    const typesToCreate = directoryTypes
      ? directoryTypes.filter(t => !existingTypes.has(t))
      : Object.keys(DIRECTORY_INFO).filter(t => !existingTypes.has(t as DirectoryType)) as DirectoryType[];

    // Create listings
    const createdListings = [];

    for (const directory of typesToCreate) {
      const listing = await this.createListing(businessProfileId, clientId, {
        directory,
        isClaimed: false,
        isVerified: false,
      });
      createdListings.push(listing);
    }

    return {
      created: createdListings.length,
      listings: createdListings,
    };
  }

  // Get recommended directories based on industry
  getRecommendedDirectories(industry?: string): DirectoryType[] {
    // Base directories everyone should have
    const essential: DirectoryType[] = ['GOOGLE', 'YELP', 'FACEBOOK', 'BING', 'APPLE_MAPS'];

    // Industry-specific recommendations
    const industrySpecific: Record<string, DirectoryType[]> = {
      restaurant: ['TRIPADVISOR', 'FOURSQUARE', 'YELLOWPAGES'],
      healthcare: ['HEALTHGRADES', 'ZOCDOC'],
      home_services: ['ANGIESLIST', 'THUMBTACK', 'HOMEADVISOR', 'BBB'],
      hospitality: ['TRIPADVISOR', 'FOURSQUARE'],
      retail: ['YELLOWPAGES', 'FOURSQUARE', 'INSTAGRAM'],
    };

    const specific = industry ? industrySpecific[industry.toLowerCase()] || [] : [];

    return [...essential, ...specific];
  }
}

export const directoryService = new DirectoryService();
