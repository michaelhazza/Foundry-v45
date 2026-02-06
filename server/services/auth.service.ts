import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users, organisations } from '../db/schema/index.js';
import { eq, and, isNull } from 'drizzle-orm';
import { generateAccessToken, generateRefreshToken } from '../lib/auth.js';

export async function register(email: string, password: string, name: string, organisationName: string) {
  const existingUser = await db.select({ id: users.id }).from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error('Email already in use');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [org] = await db.insert(organisations).values({ name: organisationName }).returning();

  const [user] = await db.insert(users).values({
    organisationId: org.id,
    email,
    passwordHash,
    role: 'admin',
  }).returning();

  const payload = { id: user.id, email: user.email, role: user.role, organisationId: user.organisationId };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role, organisationId: user.organisationId },
  };
}

export async function login(email: string, password: string) {
  const [user] = await db.select().from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  const payload = { id: user.id, email: user.email, role: user.role, organisationId: user.organisationId };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role, organisationId: user.organisationId },
  };
}
