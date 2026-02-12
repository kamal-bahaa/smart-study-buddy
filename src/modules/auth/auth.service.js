import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../prisma/client.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';

// ─── Token helpers ────────────────────────────────────────────────────────────

const generateAccessToken = (userId) =>
    jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

const generateRefreshToken = (userId) =>
    jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });




/**
 * Register a new user.
 */
export const register = async ({ name, email, password }) => {
    // 1. Check for duplicate email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw ApiError.conflict('Email is already in use');

    // 2. Hash password
    const hashed = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

    // 3. Create user in DB
    const user = await prisma.user.create({
        data: { name, email, password: hashed },
        select: { id: true, name: true, email: true, createdAt: true },
    });

    // 4. Issue tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // 5. Persist refresh token
    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
    });

    return { user, accessToken, refreshToken };
};

/**
 * Login an existing user.
 */
export const login = async ({ email, password }) => {
    // 1. Find user (include password hash for comparison)
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw ApiError.unauthorized('Invalid email or password');

    // 2. Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw ApiError.unauthorized('Invalid email or password');

    // 3. Issue tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // 4. Persist refresh token
    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
    });

    // 5. Return safe user object (no password)
    const { password: _pw, refreshToken: _rt, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
};

/**
 * Refresh the access token using a valid refresh token.
 */
export const refresh = async (token) => {
    if (!token) throw ApiError.unauthorized('Refresh token required');

    // 1. Verify signature
    let payload;
    try {
        payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
    } catch {
        throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    // 2. Check it matches what is stored in DB
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.refreshToken !== token) {
        throw ApiError.unauthorized('Refresh token has been revoked');
    }

    // 3. Issue a new access token
    const accessToken = generateAccessToken(user.id);
    return { accessToken };
};

/**
 * Logout — revoke refresh token stored in DB.
 */
export const logout = async (userId) => {
    await prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
    });
};

/**
 * Get the currently authenticated user's profile.
 */
export const getProfile = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, createdAt: true, updatedAt: true },
    });
    if (!user) throw ApiError.notFound('User not found');
    return user;
};