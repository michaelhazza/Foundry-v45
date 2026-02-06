import { db } from '../db/index.js';
import { organisations } from '../db/schema/index.js';
import { eq, and, isNull } from 'drizzle-orm';

export async function getOrganisation(organisationId: string) {
  const [org] = await db.select().from(organisations)
    .where(and(eq(organisations.id, organisationId), isNull(organisations.deletedAt)))
    .limit(1);

  if (!org) {
    throw new Error('Organisation not found');
  }
  return org;
}

export async function updateOrganisation(organisationId: string, name: string) {
  const [org] = await db.update(organisations)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(organisations.id, organisationId), isNull(organisations.deletedAt)))
    .returning();

  if (!org) {
    throw new Error('Organisation not found');
  }
  return org;
}
