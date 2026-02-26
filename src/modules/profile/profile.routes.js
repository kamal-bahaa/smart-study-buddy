import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import {
    getProfileController,
    updateProfileController,
    changePasswordController,
    deleteAccountController,
} from './profile.controller.js';

const router = Router();

router.use(authenticate);

// GET    /api/profile          
router.get('/', getProfileController);

// PATCH  /api/profile          
router.patch('/', updateProfileController);

// PATCH  /api/profile/password 
router.patch('/password', changePasswordController);

// DELETE /api/profile          
router.delete('/', deleteAccountController);

export default router;