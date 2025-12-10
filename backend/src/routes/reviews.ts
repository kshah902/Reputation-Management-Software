import { Router } from 'express';
import { reviewController } from '../controllers/reviewController';
import { authenticate, setClientContext } from '../middleware/auth';

const router = Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);
router.use(setClientContext);

// Review listing and stats
router.get('/', reviewController.list.bind(reviewController));
router.get('/stats', reviewController.getStats.bind(reviewController));
router.get('/:reviewId', reviewController.getById.bind(reviewController));

// AI suggestions
router.post('/:reviewId/suggestions', reviewController.generateAiSuggestions.bind(reviewController));

// Review responses
router.post('/:reviewId/responses', reviewController.createResponse.bind(reviewController));
router.post('/responses/:responseId/publish', reviewController.publishResponse.bind(reviewController));

// Review flagging
router.post('/:reviewId/flag', reviewController.flagReview.bind(reviewController));
router.delete('/:reviewId/flag', reviewController.unflagReview.bind(reviewController));

// Sync reviews from Google
router.post('/sync/:businessProfileId', reviewController.syncReviews.bind(reviewController));

export default router;
