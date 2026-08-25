# Feature: Platform Admin & Resource Curation Engine

## Overview
A scalable learning recommendation system requires secure operations, user auditing, and robust content curation. To support these operations, we have integrated the **Platform Admin & Resource Curation Engine**, which introduces role-based access control (RBAC), database tracking migrations, a comprehensive FastAPI administration router, and a rich Next.js admin dashboard to monitor system health and manage resources.

---

## Key Capabilities Delivered

### 1. Real-Time System Metrics & Infrastructure Monitoring
- **Infrastructure Health Checks**: Created endpoint `/api/v1/admin/system` executing real-time tests for our Postgres relational store (via active check queries) and Neo4j graph database (via active Cypher connection checks).
- **Consolidated Analytics**: Built backend endpoint `/api/v1/admin/overview` aggregation query pipeline to count total/active users, total/pending mentors, and total/pending learning resources.
- **Action Queue generation**: Dynamic analysis returns active notifications and action items directly to the UI, highlighting pending applications and submissions that require immediate admin attention.

### 2. Basic User & Role Auditing
- **Server-Side Auditing Grid**: Lists users with full text queries, role filters (`learner`, `mentor`, `admin`), and paginated offsets.
- **Role and Status Promotion/Demotion**: Admins can toggle account active status (suspend/activate) or change roles.
- **Self-Deactivation Guardrails**: Implemented active logic blocking logged-in admins from demoting or disabling their own accounts, preventing system lockout scenarios.

### 3. Structured Mentor Application Workflow
- **Application Portal**: Learners can submit applications (`/api/v1/mentor/apply`) providing their expertise, bios, and LinkedIn credentials.
- **Approve/Reject Funnel**: Admins can approve applications (automatically upgrading the user's role to `mentor`) or reject them with customizable feedback reasons stored in PostgreSQL.

### 4. Full CRUD Resource Curation Engine
- **Mentor Contribution**: Approved mentors submit learning materials (books, videos, articles) with metadata parameters such as modality, difficulty depth, duration, and target skill ID.
- **Approval Gatekeeping**: Newly submitted resources start in `PENDING` status. They are excluded from learning paths and public search queries until reviewed.
- **Resource Management Console**: Admins have full access to edit, delete, reject, or approve resources. Approving a resource immediately indexes it into path-planner vector databases and matches it to student plans.

---

## Technical Architecture & Implementation

### Role-Based Access Control (RBAC)
Implemented strict dependency injection guards in `apps/api/app/core/auth.py`:
- `require_admin`: Verifies Clerk identities and rejects non-admin users with an HTTP 403 Forbidden error.
- `require_approved_mentor`: Rejects users unless their profile role is `mentor` or `admin`.
- `require_active_user`: Enforces that suspended accounts cannot make state-altering requests.

### Database Updates
- **Alembic Migration (`0003_admin_platform_system.py`)**: Migrated PostgreSQL schema to add tracking columns to `users` (`role`, `is_active`, `name`), generated the new `mentor_applications` table, and added curation fields to `resources` (`submitted_by_id`, `status`, `rejection_reason`).
- **Drizzle ORM (`apps/web/src/db/schema.ts`)**: Synchronized client-side tables and relation schemas with matching type definitions.

### Frontend Dashboard Control Panel
Built `apps/web/src/app/(dashboard)/admin/page.tsx` displaying:
- **System Health widgets** showing real-time green/red light statuses for services.
- **Paginated User Grid** with role selectors and activation toggles.
- **Application Review list** supporting one-click approve/reject prompts.
- **Resource Management grid** with modal creation/editor panels for editing metadata.

---

## Quality Assurance & Verification
- **Test Suite (`test_platform_admin.py`)**: Authored 335 lines of tests verifying that normal users are successfully blocked, admins can CRUD resources, mentor status flows work, and self-demotion is prevented.
- **Shared Types**: Ran `./scripts/generate-types.sh` to update Next.js bindings.
- **Pristine Environment**: Maintained clean environments; temporary mock data was cleared.
