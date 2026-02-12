import { Router } from 'express';
import {
    registerController,
    loginController,
    refreshController,
    logoutController,
    getMeController,
} from './auth.controller.js';
import {
    registerRules,
    loginRules,
    validate,
} from './auth.validator.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

// ── Public routes ─────────────────────────────────────────────────────────────
router.post('/register', registerRules, validate, registerController);
router.post('/login', loginRules, validate, loginController);
router.post('/refresh', refreshController);

// ── Protected routes ──────────────────────────────────────────────────────────
router.post('/logout', authenticate, logoutController);
router.get('/me', authenticate, getMeController);

export default router;