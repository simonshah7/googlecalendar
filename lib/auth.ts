/**
 * Authentication Module for CampaignOS
 *
 * This module provides authentication utilities including:
 * - Password hashing and verification using bcrypt
 * - JWT token generation and verification
 * - Cookie management for session persistence
 * - User retrieval from database
 *
 * Security considerations:
 * - Passwords are hashed with bcrypt (12 rounds)
 * - JWTs expire after 7 days
 * - Cookies are httpOnly and secure in production
 * - Password hashes are never returned to clients
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { db, users } from '@/db';
import { eq } from 'drizzle-orm';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * JWT signing secret.
 * In production, this should be a strong random string set via AUTH_SECRET env var.
 * The default is only for development purposes.
 */
const JWT_SECRET = process.env.AUTH_SECRET || 'campaignos-dev-secret';

/**
 * Name of the HTTP-only cookie used to store the JWT token.
 */
const COOKIE_NAME = 'campaignos_token';

/**
 * Number of bcrypt salt rounds for password hashing.
 * Higher values are more secure but slower.
 */
const BCRYPT_ROUNDS = 12;

/**
 * JWT token expiration time in seconds (7 days).
 */
const TOKEN_EXPIRY_SECONDS = 60 * 60 * 24 * 7;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Payload stored within the JWT token.
 * Contains essential user info for quick authorization checks.
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: string; // 'User' | 'Manager' | 'Admin'
}

/**
 * User object returned from getCurrentUser().
 * Excludes sensitive fields like passwordHash.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PASSWORD UTILITIES
// ============================================================================

/**
 * Hash a plain-text password using bcrypt.
 *
 * @param password - Plain-text password to hash
 * @returns Hashed password string
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a plain-text password against a bcrypt hash.
 *
 * @param password - Plain-text password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns True if password matches, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================================================
// JWT UTILITIES
// ============================================================================

/**
 * Create a signed JWT token with the given payload.
 *
 * @param payload - User data to encode in the token
 * @returns Signed JWT string
 */
export function createToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verify and decode a JWT token.
 *
 * @param token - JWT string to verify
 * @returns Decoded payload if valid, null if invalid or expired
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    // Token is invalid, expired, or malformed
    return null;
  }
}

// ============================================================================
// COOKIE MANAGEMENT
// ============================================================================

/**
 * Set the authentication cookie with the given JWT token.
 *
 * Cookie configuration:
 * - httpOnly: Prevents JavaScript access (XSS protection)
 * - secure: Only sent over HTTPS in production
 * - sameSite: 'lax' prevents CSRF while allowing navigation
 * - maxAge: 7 days to match JWT expiration
 *
 * @param token - JWT token to store in cookie
 */
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_EXPIRY_SECONDS,
    path: '/',
  });
}

/**
 * Remove the authentication cookie (logout).
 */
export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Get the authentication token from cookies.
 *
 * @returns JWT token string if present, null otherwise
 */
export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  return cookie?.value || null;
}

// ============================================================================
// USER AUTHENTICATION
// ============================================================================

/**
 * Get the currently authenticated user from the session cookie.
 *
 * This function:
 * 1. Retrieves the JWT from cookies
 * 2. Verifies and decodes the token
 * 3. Fetches the full user record from the database
 * 4. Returns user data without sensitive fields
 *
 * @returns User object without passwordHash, or null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getAuthToken();
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  // Fetch user from database to ensure they still exist and get latest data
  const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (!user) return null;

  // Exclude password hash from returned user object
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Require authentication - throws if user is not logged in.
 *
 * Use this in API routes that require authentication.
 * Prefer using getCurrentUser() for more control over the response.
 *
 * @throws Error if user is not authenticated
 * @returns Authenticated user object
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
