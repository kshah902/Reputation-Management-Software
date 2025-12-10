import { Router } from 'express';
import { customerController, uploadCSV } from '../controllers/customerController';
import { authenticate, setClientContext } from '../middleware/auth';

const router = Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);
router.use(setClientContext);

// Customer CRUD
router.post('/', customerController.create.bind(customerController));
router.get('/', customerController.list.bind(customerController));
router.get('/:customerId', customerController.getById.bind(customerController));
router.put('/:customerId', customerController.update.bind(customerController));
router.delete('/:customerId', customerController.delete.bind(customerController));

// CSV Import
router.post('/import', uploadCSV, customerController.importCSV.bind(customerController));
router.get('/import/:importId/status', customerController.getImportStatus.bind(customerController));

// Bulk operations
router.post('/bulk/opt-out', customerController.bulkOptOut.bind(customerController));
router.post('/bulk/tags', customerController.addTags.bind(customerController));

export default router;
