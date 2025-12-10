import { Router } from 'express';
import authRoutes from './auth';
import clientRoutes from './clients';
import customerRoutes from './customers';
import campaignRoutes from './campaigns';
import reviewRoutes from './reviews';
import businessProfileRoutes from './businessProfiles';
import { businessProfileController } from '../controllers/businessProfileController';

const router = Router();

// API health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/clients', clientRoutes);

// Client-scoped routes
router.use('/clients/:clientId/customers', customerRoutes);
router.use('/clients/:clientId/campaigns', campaignRoutes);
router.use('/clients/:clientId/reviews', reviewRoutes);
router.use('/clients/:clientId/business-profiles', businessProfileRoutes);

// Shorthand routes (uses clientId from auth context)
router.use('/customers', customerRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/reviews', reviewRoutes);
router.use('/business-profiles', businessProfileRoutes);

// Public review link redirect
router.get('/r/:shortCode', businessProfileController.handleReviewLinkRedirect.bind(businessProfileController));

export default router;
