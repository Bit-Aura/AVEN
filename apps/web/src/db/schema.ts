import { pgTable, serial, text, timestamp, integer, boolean, json, doublePrecision } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// --- Organizations & Tenancy ---
export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  clerkId: text('clerk_id').unique().notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- Users & Roles ---
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  clerkId: text('clerk_id').unique().notNull(),
  email: text('email').unique().notNull(),
  organizationId: integer('organization_id').references(() => organizations.id),
  role: text('role').default('learner'), // learner, mentor, tpo-admin
  createdAt: timestamp('created_at').defaultNow(),
});

// --- EIKG Nodes (Skills) ---
// Note: Aligned with the Python backend's SkillRecord, though Neo4j is the master for traversal.
export const skills = pgTable('skills', {
  id: text('id').primaryKey(), // using text to match Neo4j UUIDs/names
  name: text('name').unique().notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- EIKG Edges ---
// For Drizzle/Postgres queries, although actual traversal happens in Neo4j.
export const skillEdges = pgTable('skill_edges', {
  id: serial('id').primaryKey(),
  sourceSkillId: text('source_skill_id').references(() => skills.id).notNull(),
  targetSkillId: text('target_skill_id').references(() => skills.id).notNull(),
  relationType: text('relation_type').default('REQUIRES'),
});

// --- Mastery State ---
export const masteryStates = pgTable('mastery_states', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  skillId: text('skill_id').references(() => skills.id).notNull(),
  confidenceScore: doublePrecision('confidence_score').default(0.0),
  lastPracticedAt: timestamp('last_practiced_at'),
  nextPracticeAt: timestamp('next_practice_at'), // For forgetting curve (Feature 1)
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// --- Credential Records (W3C VC Data Model stub) ---
export const credentialRecords = pgTable('credential_records', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  vcType: text('vc_type').notNull(),
  vcJson: json('vc_json').notNull(), // The actual JSON payload of the credential
  validUntil: timestamp('valid_until'),
  isRevoked: boolean('is_revoked').default(false), // BitstringStatusList stub
  createdAt: timestamp('created_at').defaultNow(),
});

// --- xAPI Event Log ---
export const xapiEvents = pgTable('xapi_events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  verb: text('verb').notNull(), // e.g., 'completed', 'failed', 'viewed'
  objectId: text('object_id').notNull(), // e.g., skill_id or resource_id
  context: json('context'),
  timestamp: timestamp('timestamp').defaultNow(),
});
