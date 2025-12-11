import { Router } from 'express';
import { directoryController } from '../controllers/directoryController';
import { authenticate, setClientContext } from '../middleware/auth';

const router = Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);
router.use(setClientContext);

// Get available directories (master list)
router.get('/available', directoryController.getAvailableDirectories.bind(directoryController));

// Get recommended directories based on industry
router.get('/recommended', directoryController.getRecommendedDirectories.bind(directoryController));

// Profile-specific directory routes
router.get('/profiles/:profileId/listings', directoryController.getListings.bind(directoryController));
router.post('/profiles/:profileId/listings', directoryController.createListing.bind(directoryController));
router.post('/profiles/:profileId/listings/auto-create', directoryController.autoCreateListings.bind(directoryController));
router.post('/profiles/:profileId/sync-all', directoryController.syncAllWithMaster.bind(directoryController));

// Individual listing routes
router.put('/listings/:listingId', directoryController.updateListing.bind(directoryController));
router.delete('/listings/:listingId', directoryController.deleteListing.bind(directoryController));
router.post('/listings/:listingId/check-consistency', directoryController.checkConsistency.bind(directoryController));

export default router;
