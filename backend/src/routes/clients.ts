import { Router } from 'express';
import { clientController } from '../controllers/clientController';
import { authenticate, authorize, requireAgency } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Agency-level client management
router.post(
  '/',
  authorize(UserRole.AGENCY_OWNER, UserRole.AGENCY_ADMIN),
  requireAgency,
  clientController.create.bind(clientController)
);

router.get(
  '/',
  authorize(UserRole.AGENCY_OWNER, UserRole.AGENCY_ADMIN, UserRole.AGENCY_USER),
  requireAgency,
  clientController.list.bind(clientController)
);

router.get(
  '/:clientId',
  authorize(UserRole.AGENCY_OWNER, UserRole.AGENCY_ADMIN, UserRole.AGENCY_USER, UserRole.CLIENT_ADMIN, UserRole.CLIENT_USER),
  clientController.getById.bind(clientController)
);

router.put(
  '/:clientId',
  authorize(UserRole.AGENCY_OWNER, UserRole.AGENCY_ADMIN),
  clientController.update.bind(clientController)
);

router.delete(
  '/:clientId',
  authorize(UserRole.AGENCY_OWNER, UserRole.AGENCY_ADMIN),
  clientController.delete.bind(clientController)
);

// Client users management
router.post(
  '/:clientId/users',
  authorize(UserRole.AGENCY_OWNER, UserRole.AGENCY_ADMIN, UserRole.CLIENT_ADMIN),
  clientController.createUser.bind(clientController)
);

router.get(
  '/:clientId/users',
  authorize(UserRole.AGENCY_OWNER, UserRole.AGENCY_ADMIN, UserRole.CLIENT_ADMIN),
  clientController.listUsers.bind(clientController)
);

// Dashboard stats
router.get(
  '/:clientId/dashboard',
  clientController.getDashboardStats.bind(clientController)
);

export default router;
