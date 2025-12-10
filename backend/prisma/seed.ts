import { PrismaClient, UserRole, PlanType, CampaignType, ScheduleType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo agency
  const agency = await prisma.agency.upsert({
    where: { email: 'demo@agency.com' },
    update: {},
    create: {
      name: 'Demo Agency',
      slug: 'demo-agency',
      email: 'demo@agency.com',
      phone: '+1 (555) 123-4567',
      website: 'https://demo-agency.com',
      plan: PlanType.PROFESSIONAL,
    },
  });

  console.log('✅ Created agency:', agency.name);

  // Create demo user
  const passwordHash = await bcrypt.hash('password123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@agency.com' },
    update: {},
    create: {
      email: 'demo@agency.com',
      passwordHash,
      firstName: 'Demo',
      lastName: 'User',
      role: UserRole.AGENCY_OWNER,
      agencyId: agency.id,
      emailVerified: true,
    },
  });

  console.log('✅ Created user:', user.email);

  // Create demo client
  const client = await prisma.client.upsert({
    where: { agencyId_slug: { agencyId: agency.id, slug: 'acme-restaurant' } },
    update: {},
    create: {
      agencyId: agency.id,
      name: 'Acme Restaurant',
      slug: 'acme-restaurant',
      email: 'contact@acme-restaurant.com',
      phone: '+1 (555) 987-6543',
      industry: 'Restaurant',
    },
  });

  console.log('✅ Created client:', client.name);

  // Create business profile
  const businessProfile = await prisma.businessProfile.upsert({
    where: { googlePlaceId: 'demo-place-id' },
    update: {},
    create: {
      clientId: client.id,
      googlePlaceId: 'demo-place-id',
      name: 'Acme Restaurant',
      address: '123 Main Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      country: 'US',
      phone: '+1 (555) 987-6543',
      website: 'https://acme-restaurant.com',
      primaryCategory: 'Restaurant',
      categories: ['American Restaurant', 'Bar'],
      description: 'A family-friendly restaurant serving American classics.',
      mondayHours: '11:00 - 22:00',
      tuesdayHours: '11:00 - 22:00',
      wednesdayHours: '11:00 - 22:00',
      thursdayHours: '11:00 - 22:00',
      fridayHours: '11:00 - 23:00',
      saturdayHours: '10:00 - 23:00',
      sundayHours: '10:00 - 21:00',
      averageRating: 4.5,
      totalReviews: 127,
      isVerified: true,
    },
  });

  console.log('✅ Created business profile:', businessProfile.name);

  // Create review link
  await prisma.reviewLink.upsert({
    where: { id: 'demo-review-link' },
    update: {},
    create: {
      id: 'demo-review-link',
      businessProfileId: businessProfile.id,
      platform: 'google',
      fullUrl: 'https://search.google.com/local/writereview?placeid=demo-place-id',
      shortUrl: 'http://localhost:3001/r/acme123',
    },
  });

  // Create demo customers
  const customers = [
    { firstName: 'John', lastName: 'Smith', email: 'john.smith@example.com', phone: '+15551234567' },
    { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.j@example.com', phone: '+15552345678' },
    { firstName: 'Michael', lastName: 'Brown', email: 'mbrown@example.com', phone: '+15553456789' },
    { firstName: 'Emily', lastName: 'Davis', email: 'emily.d@example.com', phone: '+15554567890' },
    { firstName: 'David', lastName: 'Wilson', email: 'dwilson@example.com', phone: '+15555678901' },
  ];

  for (const customerData of customers) {
    await prisma.customer.upsert({
      where: { clientId_email: { clientId: client.id, email: customerData.email } },
      update: {},
      create: {
        clientId: client.id,
        ...customerData,
        source: 'MANUAL',
      },
    });
  }

  console.log('✅ Created', customers.length, 'demo customers');

  // Create demo reviews
  const reviews = [
    { rating: 5, reviewerName: 'Happy Customer', comment: 'Amazing food and great service! Will definitely come back.', sentiment: 'POSITIVE' },
    { rating: 4, reviewerName: 'Regular Diner', comment: 'Good food, nice atmosphere. A bit pricey but worth it.', sentiment: 'POSITIVE' },
    { rating: 5, reviewerName: 'Food Lover', comment: 'Best burgers in town! The staff was incredibly friendly.', sentiment: 'POSITIVE' },
    { rating: 3, reviewerName: 'First Timer', comment: 'Food was okay, service was slow during peak hours.', sentiment: 'NEUTRAL' },
    { rating: 2, reviewerName: 'Disappointed', comment: 'Long wait time and order was wrong. Hope they improve.', sentiment: 'NEGATIVE' },
  ];

  for (let i = 0; i < reviews.length; i++) {
    const review = reviews[i];
    await prisma.review.upsert({
      where: { externalId: `demo-review-${i + 1}` },
      update: {},
      create: {
        clientId: client.id,
        businessProfileId: businessProfile.id,
        platform: 'google',
        externalId: `demo-review-${i + 1}`,
        reviewerName: review.reviewerName,
        rating: review.rating,
        comment: review.comment,
        sentiment: review.sentiment as any,
        needsResponse: review.rating < 4,
        publishedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Stagger dates
      },
    });
  }

  console.log('✅ Created', reviews.length, 'demo reviews');

  // Create demo campaign
  const campaign = await prisma.campaign.upsert({
    where: { id: 'demo-campaign' },
    update: {},
    create: {
      id: 'demo-campaign',
      clientId: client.id,
      name: 'Monthly Review Request',
      description: 'Automated monthly review request campaign',
      type: CampaignType.REVIEW_REQUEST,
      status: 'DRAFT',
      emailEnabled: true,
      smsEnabled: true,
      emailSubject: '{{customerName}}, how was your experience at {{businessName}}?',
      emailTemplate: `
        <h2>Hi {{customerName}},</h2>
        <p>Thank you for visiting {{businessName}}! We hope you had a great experience.</p>
        <p>Would you mind taking a moment to leave us a review? Your feedback helps us improve!</p>
        <p><a href="{{reviewLink}}">Leave a Review</a></p>
        <p>Thank you!</p>
      `,
      smsTemplate: 'Hi {{customerName}}! Thanks for visiting {{businessName}}. We\'d love your feedback: {{reviewLink}}',
      scheduleType: ScheduleType.IMMEDIATE,
      totalRecipients: 5,
    },
  });

  console.log('✅ Created demo campaign:', campaign.name);

  console.log('🎉 Seeding complete!');
  console.log('\n📝 Demo credentials:');
  console.log('   Email: demo@agency.com');
  console.log('   Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
