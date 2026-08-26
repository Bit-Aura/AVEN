"""
Revision ID: 0005
Revises: 0004
Create Date: 2026-08-26 15:50:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0005'
down_revision: Union[str, None] = '0004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Cohorts Table
    op.create_table(
        'cohorts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('institution', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_cohorts_name', 'cohorts', ['name'])

    # 2. Cohort Members Table
    op.create_table(
        'cohort_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('cohort_id', sa.Integer(), nullable=False),
        sa.Column('profile_id', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['cohort_id'], ['cohorts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['profile_id'], ['learner_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('cohort_id', 'profile_id', name='uq_cohort_member')
    )
    op.create_index('ix_cohort_members_cohort_id', 'cohort_members', ['cohort_id'])
    op.create_index('ix_cohort_members_profile_id', 'cohort_members', ['profile_id'])

    # 3. Placement Drives Table
    op.create_table(
        'placement_drives',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('cohort_id', sa.Integer(), nullable=True),
        sa.Column('company_name', sa.String(length=255), nullable=False),
        sa.Column('role_title', sa.String(length=255), nullable=False),
        sa.Column('target_date', sa.String(length=50), nullable=False),
        sa.Column('required_skills', sa.JSON(), nullable=False),
        sa.Column('readiness_threshold', sa.Float(), nullable=False, server_default='0.70'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['cohort_id'], ['cohorts.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_placement_drives_cohort_id', 'placement_drives', ['cohort_id'])
    op.create_index('ix_placement_drives_company_name', 'placement_drives', ['company_name'])

    # 4. Mentor Interventions Table
    op.create_table(
        'mentor_interventions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('profile_id', sa.Integer(), nullable=False),
        sa.Column('mentor_id', sa.Integer(), nullable=False),
        sa.Column('cohort_id', sa.Integer(), nullable=True),
        sa.Column('placement_drive_id', sa.Integer(), nullable=True),
        sa.Column('action_type', sa.String(length=50), nullable=False),
        sa.Column('priority', sa.String(length=50), nullable=False, server_default='HIGH'),
        sa.Column('focus_skills', sa.JSON(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('recommended_timing', sa.String(length=50), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['profile_id'], ['learner_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['mentor_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['cohort_id'], ['cohorts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['placement_drive_id'], ['placement_drives.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_mentor_interventions_profile_id', 'mentor_interventions', ['profile_id'])
    op.create_index('ix_mentor_interventions_mentor_id', 'mentor_interventions', ['mentor_id'])
    op.create_index('ix_mentor_interventions_cohort_id', 'mentor_interventions', ['cohort_id'])

    # 5. AI Coach Escalations Table
    op.create_table(
        'ai_coach_escalations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('profile_id', sa.Integer(), nullable=False),
        sa.Column('skill_id', sa.String(length=255), nullable=True),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=False, server_default='HIGH'),
        sa.Column('thrash_index', sa.Float(), nullable=True),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='OPEN'),
        sa.Column('context_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['profile_id'], ['learner_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ai_coach_escalations_profile_id', 'ai_coach_escalations', ['profile_id'])
    op.create_index('ix_ai_coach_escalations_skill_id', 'ai_coach_escalations', ['skill_id'])

def downgrade() -> None:
    op.drop_index('ix_ai_coach_escalations_skill_id', table_name='ai_coach_escalations')
    op.drop_index('ix_ai_coach_escalations_profile_id', table_name='ai_coach_escalations')
    op.drop_table('ai_coach_escalations')

    op.drop_index('ix_mentor_interventions_cohort_id', table_name='mentor_interventions')
    op.drop_index('ix_mentor_interventions_mentor_id', table_name='mentor_interventions')
    op.drop_index('ix_mentor_interventions_profile_id', table_name='mentor_interventions')
    op.drop_table('mentor_interventions')

    op.drop_index('ix_placement_drives_company_name', table_name='placement_drives')
    op.drop_index('ix_placement_drives_cohort_id', table_name='placement_drives')
    op.drop_table('placement_drives')

    op.drop_index('ix_cohort_members_profile_id', table_name='cohort_members')
    op.drop_index('ix_cohort_members_cohort_id', table_name='cohort_members')
    op.drop_table('cohort_members')

    op.drop_index('ix_cohorts_name', table_name='cohorts')
    op.drop_table('cohorts')
