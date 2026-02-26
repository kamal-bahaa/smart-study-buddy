import bcrypt from 'bcrypt';
import prisma from '../../prisma/client.js';
import { ApiError } from '../../utils/ApiError.js';
import { env } from '../../config/env.js';


export const getProfile = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, createdAt: true, updatedAt: true },
    });

    if (!user) throw ApiError.notFound('User not found');
    return user;
};


export const updateProfile = async (userId, updates) => {
    const { name } = updates;

    if (!name || !name.trim()) {
        throw ApiError.badRequest('Name is required');
    }

    return prisma.user.update({
        where: { id: userId },
        data: { name: name.trim() },
        select: { id: true, name: true, email: true, createdAt: true, updatedAt: true },
    });
};


export const changePassword = async (userId, { currentPassword, newPassword }) => {
    if (!currentPassword || !newPassword) {
        throw ApiError.badRequest('Current password and new password are required');
    }

    if (newPassword.length < 8) {
        throw ApiError.badRequest('New password must be at least 8 characters');
    }

    if (currentPassword === newPassword) {
        throw ApiError.badRequest('New password must be different from current password');
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, password: true },
    });

    if (!user) throw ApiError.notFound('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) throw ApiError.badRequest('Current password is incorrect');

    const hashed = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);

    await prisma.user.update({
        where: { id: userId },
        data: { password: hashed },
    });
};


export const deleteAccount = async (userId, { password }) => {
    if (!password) throw ApiError.badRequest('Password is required to delete account');

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, password: true },
    });

    if (!user) throw ApiError.notFound('User not found');

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw ApiError.unauthorized('Incorrect password');

    await prisma.user.delete({ where: { id: userId } });
};