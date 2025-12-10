import { Router } from 'express';
import { campaignController } from '../controllers/campaignController';
import { authenticate, setClientContext } from '../middleware/auth';

const router = Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);
router.use(setClientContext);

// Campaign CRUD
router.post('/', campaignController.create.bind(campaignController));
router.get('/', campaignController.list.bind(campaignController));
router.get('/:campaignId', campaignController.getById.bind(campaignController));
router.put('/:campaignId', campaignController.update.bind(campaignController));
router.delete('/:campaignId', campaignController.delete.bind(campaignController));

// Campaign recipients
router.post('/:campaignId/recipients', campaignController.addRecipients.bind(campaignController));
router.delete('/:campaignId/recipients', campaignController.removeRecipients.bind(campaignController));

// Campaign actions
router.post('/:campaignId/launch', campaignController.launch.bind(campaignController));
router.post('/:campaignId/pause', campaignController.pause.bind(campaignController));
router.post('/:campaignId/resume', campaignController.resume.bind(campaignController));

// Campaign stats
router.get('/:campaignId/stats', campaignController.getStats.bind(campaignController));

export default router;
