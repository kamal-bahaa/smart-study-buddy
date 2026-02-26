import {
    getProfile,
    updateProfile,
    changePassword,
    deleteAccount,
} from './profile.service.js';
import { sendSuccess } from '../../utils/ApiResponse.js';

// GET /api/profile
export const getProfileController = async (req, res, next) => {
    try {
        const user = await getProfile(req.user.userId);
        return sendSuccess(res, 200, 'Profile retrieved successfully', { user });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/profile
export const updateProfileController = async (req, res, next) => {
    try {
        const user = await updateProfile(req.user.userId, req.body);
        return sendSuccess(res, 200, 'Profile updated successfully', { user });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/profile/password
export const changePasswordController = async (req, res, next) => {
    try {
        await changePassword(req.user.userId, req.body);
        return sendSuccess(res, 200, 'Password changed successfully');
    } catch (err) {
        next(err);
    }
};

// DELETE /api/profile
export const deleteAccountController = async (req, res, next) => {
    try {
        await deleteAccount(req.user.userId, req.body);
        return sendSuccess(res, 200, 'Account deleted successfully');
    } catch (err) {
        next(err);
    }
};