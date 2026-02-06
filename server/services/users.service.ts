import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';
import { eq, and, isNull, sql } from 'drizzle-orm';

function clampPagination(page?: string | number, limit?: string | number) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  return { page: p, limit: l, offset: (p - 1) * l };
}

export async function listUsers(organisationId: string, page?: string, limit?: string) {
  const p = clampPagination(page, limit);

  const data = await db.select({
    id: users.id,
    email: users.email,
    role: users.role,
    organisationId: users.organisationId,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  }).from(users)
    .where(and(eq(users.organisationId, organisationId), isNull(users.deletedAt)))
    .limit(p.limit)
    .offset(p.offset);

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users)
    .where(and(eq(users.organisationId, organisationId), isNull(users.deletedAt)));

  return { data, pagination: { page: p.page, limit: p.limit, total: count } };
}

export async function getUser(organisationId: string, userId: string) {
  const [user] = await db.select({
    id: users.id,
    email: users.email,
    role: users.role,
    organisationId: users.organisationId,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  }).from(users)
    .where(and(
      eq(users.id, userId),
      eq(users.organisationId, organisationId),
      isNull(users.deletedAt)
    ))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }
  return user;
}

export async function inviteUser(organisationId: string, email: string, role: string) {
  const existingUser = await db.select({ id: users.id }).from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error('Email already in use');
  }

  // Generate a temporary password for invite - user should change on first login
  const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const [user] = await db.insert(users).values({
    organisationId,
    email,
    passwordHash,
    role: role as 'admin' | 'member',
  }).returning();

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    organisationId: user.organisationId,
    createdAt: user.createdAt,
  };
}

export async function updateUser(organisationId: string, userId: string, role: string) {
  const [user] = await db.update(users)
    .set({ role: role as 'admin' | 'member', updatedAt: new Date() })
    .where(and(
      eq(users.id, userId),
      eq(users.organisationId, organisationId),
      isNull(users.deletedAt)
    ))
    .returning();

  if (!user) {
    throw new Error('User not found');
  }
  return { id: user.id, email: user.email, role: user.role, organisationId: user.organisationId };
}

export async function deleteUser(organisationId: string, userId: string) {
  const [user] = await db.update(users)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(users.id, userId),
      eq(users.organisationId, organisationId),
      isNull(users.deletedAt)
    ))
    .returning();

  if (!user) {
    throw new Error('User not found');
  }
  return { success: true };
}
