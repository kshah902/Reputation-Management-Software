import { Router } from 'express';
import { businessProfileController } from '../controllers/businessProfileController';
import { authenticate, setClientContext } from '../middleware/auth';

const router = Router({ mergeParams: true });

// All routes require authentication (except redirect)
router.use(authenticate);
router.use(setClientContext);

// Business Profile CRUD
router.post('/', businessProfileController.create.bind(businessProfileController));
router.get('/', businessProfileController.list.bind(businessProfileController));
router.get('/:profileId', businessProfileController.getById.bind(businessProfileController));
router.put('/:profileId', businessProfileController.update.bind(businessProfileController));
router.delete('/:profileId', businessProfileController.delete.bind(businessProfileController));

// Google integration
router.get('/:profileId/google/auth-url', businessProfileController.getGoogleAuthUrl.bind(businessProfileController));
router.get('/:profileId/google/callback', businessProfileController.connectGoogle.bind(businessProfileController));
router.get('/:profileId/google/accounts', businessProfileController.getGoogleAccounts.bind(businessProfileController));
router.get('/:profileId/google/accounts/:accountId/locations', businessProfileController.getGoogleLocations.bind(businessProfileController));
router.post('/:profileId/google/select-location', businessProfileController.selectGoogleLocation.bind(businessProfileController));
router.post('/:profileId/google/sync', businessProfileController.syncWithGoogle.bind(businessProfileController));

// Photos management
router.get('/:profileId/photos', businessProfileController.getPhotos.bind(businessProfileController));
router.post('/:profileId/photos', businessProfileController.addPhoto.bind(businessProfileController));
router.put('/:profileId/photos/:photoId', businessProfileController.updatePhoto.bind(businessProfileController));
router.delete('/:profileId/photos/:photoId', businessProfileController.deletePhoto.bind(businessProfileController));

// Posts management
router.get('/:profileId/posts', businessProfileController.getPosts.bind(businessProfileController));
router.post('/:profileId/posts', businessProfileController.createPost.bind(businessProfileController));
router.put('/:profileId/posts/:postId', businessProfileController.updatePost.bind(businessProfileController));
router.delete('/:profileId/posts/:postId', businessProfileController.deletePost.bind(businessProfileController));
router.post('/:profileId/posts/:postId/publish', businessProfileController.publishPost.bind(businessProfileController));

// Business hours
router.put('/:profileId/hours', businessProfileController.updateHours.bind(businessProfileController));

export default router;
