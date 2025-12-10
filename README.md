# Reputation Management Software

A full-stack platform for agencies and businesses to automate review generation, track and respond to reviews, and maintain consistent business listings across online directories.

## Features

### Core Capabilities

- **Customer Data Import & Sync**
  - CSV file upload with automatic field mapping
  - API endpoint for real-time CRM/POS integration
  - Data validation and deduplication

- **Automated Review Requests**
  - Email and SMS campaign management
  - Customizable templates with personalization tokens
  - Scheduling: immediate, delayed, or drip campaigns
  - Auto-fetch Google Review links

- **Review Monitoring & AI Responses**
  - Google Business Profile integration via OAuth
  - Real-time review sync and notifications
  - AI-powered response suggestions (professional, friendly, apologetic tones)
  - Sentiment analysis and keyword extraction

- **Business Information Sync (Local SEO)**
  - Import and sync GBP data (NAP, hours, categories)
  - Push updates to major directories
  - Category-specific directory recommendations

- **Dashboard & Analytics**
  - Review growth and rating trends
  - Campaign performance metrics
  - Sentiment analysis graphs
  - Response rate tracking

- **Multi-Tenant Structure**
  - Agency admin dashboard
  - Client-level data segmentation
  - Role-based access control

## Tech Stack

- **Frontend:** Next.js 14, React, TailwindCSS, React Query
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Queue:** Redis with Bull
- **Integrations:** Google Business Profile API, Maileroo (Email), Telnyx (SMS)
- **AI:** Anthropic Claude for response generation

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/kshah902/Reputation-Management-Software.git
   cd Reputation-Management-Software
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration
   ```

4. **Start the database**
   ```bash
   docker-compose up -d postgres redis
   ```

5. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

6. **Start development servers**
   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### Docker Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Project Structure

```
├── backend/                 # Express API server
│   ├── prisma/             # Database schema & migrations
│   │   └── schema.prisma   # Prisma schema
│   └── src/
│       ├── config/         # Configuration
│       ├── controllers/    # Route handlers
│       ├── integrations/   # External service clients
│       ├── middleware/     # Express middleware
│       ├── routes/         # API routes
│       ├── services/       # Business logic
│       └── utils/          # Helpers
│
├── frontend/               # Next.js application
│   └── src/
│       ├── app/           # App router pages
│       ├── components/    # React components
│       ├── hooks/         # Custom hooks
│       ├── lib/           # Utilities
│       ├── services/      # API client
│       ├── store/         # State management
│       └── types/         # TypeScript types
│
├── docs/                   # Documentation
└── docker-compose.yml      # Docker configuration
```

## API Documentation

### Authentication

All API endpoints (except auth) require a Bearer token:

```
Authorization: Bearer <access_token>
```

Or API Key for programmatic access:

```
Authorization: ApiKey <api_key>
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new agency |
| POST | `/api/auth/login` | User login |
| GET | `/api/clients` | List clients |
| POST | `/api/clients` | Create client |
| GET | `/api/clients/:id/customers` | List customers |
| POST | `/api/clients/:id/customers/import` | Import CSV |
| GET | `/api/clients/:id/campaigns` | List campaigns |
| POST | `/api/clients/:id/campaigns` | Create campaign |
| GET | `/api/clients/:id/reviews` | List reviews |
| POST | `/api/reviews/:id/suggestions` | Generate AI responses |

## Environment Variables

### Backend

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | For GBP |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | For GBP |
| `MAILEROO_API_KEY` | Maileroo API key | For Email |
| `TELNYX_API_KEY` | Telnyx API key | For SMS |
| `ANTHROPIC_API_KEY` | Anthropic API key | For AI |

## Database Schema

The database includes the following main entities:

- **Agency** - Top-level organization (multi-tenant)
- **Client** - Business managed by agency
- **User** - System users with roles
- **Customer** - Customer contacts for campaigns
- **Campaign** - Review request campaigns
- **Review** - Reviews from Google/other platforms
- **BusinessProfile** - Business listing information
- **DirectoryListing** - External directory sync status

## Future Enhancements

- [ ] Automated review dispute submission
- [ ] Voice call review requests
- [ ] Client-branded landing pages
- [ ] QR code generator for in-office prompts
- [ ] Competitor review analysis
- [ ] AI-powered reputation repair suggestions
- [ ] Additional directory integrations (Yelp, TripAdvisor, etc.)

## Security

- JWT-based authentication with refresh tokens
- API key support for integrations
- Role-based access control (RBAC)
- Rate limiting on all endpoints
- Input validation with Zod
- SQL injection prevention via Prisma
- XSS protection with proper escaping
- CORS configuration for frontend

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For support, please contact [support@example.com](mailto:support@example.com) or open an issue on GitHub.
