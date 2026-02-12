import * as authService from './auth.service.js';
import { sendSuccess } from '../../utils/ApiResponse.js';

// POST /api/auth/register
export const registerController = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const result = await authService.register({ name, email, password });
        return sendSuccess(res, 201, 'Registration successful', result);
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/login
export const loginController = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await authService.login({ email, password });
        return sendSuccess(res, 200, 'Login successful', result);
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/refresh
export const refreshController = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        const result = await authService.refresh(refreshToken);
        return sendSuccess(res, 200, 'Token refreshed', result);
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/logout  (requires valid access token)
export const logoutController = async (req, res, next) => {
    try {
        await authService.logout(req.user.userId);
        return sendSuccess(res, 200, 'Logged out successfully');
    } catch (err) {
        next(err);
    }
};

// GET /api/auth/me  (requires valid access token)
export const getMeController = async (req, res, next) => {
    try {
        const user = await authService.getProfile(req.user.userId);
        return sendSuccess(res, 200, 'Profile fetched', user);
    } catch (err) {
        next(err);
    }
};