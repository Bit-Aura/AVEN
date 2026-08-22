"""
Revision ID: 0001
Revises: 
Create Date: 2026-08-20 22:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import pgvector.sqlalchemy

revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Setup pgvector extension
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    
    # 1. users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('clerk_id', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_clerk_id'), 'users', ['clerk_id'], unique=True)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 2. learner_profiles table
    op.create_table(
        'learner_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('current_context', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )

    # 3. goals table
    op.create_table(
        'goals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('profile_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('embedding', pgvector.sqlalchemy.Vector(dim=384), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['profile_id'], ['learner_profiles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # 4. diagnostic_sessions table
    op.create_table(
        'diagnostic_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('profile_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['profile_id'], ['learner_profiles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # 5. diagnostic_turns table
    op.create_table(
        'diagnostic_turns',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('prompt', sa.Text(), nullable=False),
        sa.Column('response', sa.Text(), nullable=True),
        sa.Column('turn_number', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['diagnostic_sessions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # 6. assessment_items table
    op.create_table(
        'assessment_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('difficulty', sa.String(length=50), nullable=False),
        sa.Column('embedding', pgvector.sqlalchemy.Vector(dim=384), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 7. assessment_attempts table
    op.create_table(
        'assessment_attempts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('profile_id', sa.Integer(), nullable=False),
        sa.Column('assessment_item_id', sa.Integer(), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('is_correct', sa.Boolean(), nullable=False),
        sa.Column('response_data', sa.Text(), nullable=True),
        sa.Column('attempted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['assessment_item_id'], ['assessment_items.id'], ),
        sa.ForeignKeyConstraint(['profile_id'], ['learner_profiles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # 8. path_versions table
    op.create_table(
        'path_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('profile_id', sa.Integer(), nullable=False),
        sa.Column('parent_version_id', sa.Integer(), nullable=True),
        sa.Column('trigger_event', sa.String(length=255), nullable=False),
        sa.Column('changed_nodes', sa.JSON(), nullable=False),
        sa.Column('decision_trace', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['parent_version_id'], ['path_versions.id'], ),
        sa.ForeignKeyConstraint(['profile_id'], ['learner_profiles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # 9. readiness_snapshots table
    op.create_table(
        'readiness_snapshots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('profile_id', sa.Integer(), nullable=False),
        sa.Column('skill_id', sa.String(length=255), nullable=False),
        sa.Column('readiness_score', sa.Float(), nullable=False),
        sa.Column('last_updated', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['profile_id'], ['learner_profiles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # 10. resources table
    op.create_table(
        'resources',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('url', sa.String(length=512), nullable=False),
        sa.Column('embedding', pgvector.sqlalchemy.Vector(dim=384), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 11. resource_metadata table
    op.create_table(
        'resource_metadata',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('resource_id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=255), nullable=False),
        sa.Column('value', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['resource_id'], ['resources.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # 12. feedback_events table
    op.create_table(
        'feedback_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('target_type', sa.String(length=50), nullable=False),
        sa.Column('target_id', sa.Integer(), nullable=False),
        sa.Column('feedback_type', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # 13. domain_events table
    op.create_table(
        'domain_events',
        sa.Column('event_id', sa.String(length=255), nullable=False),
        sa.Column('event_type', sa.String(length=255), nullable=False),
        sa.Column('aggregate_id', sa.String(length=255), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('event_id')
    )

def downgrade() -> None:
    op.drop_table('domain_events')
    op.drop_table('feedback_events')
    op.drop_table('resource_metadata')
    op.drop_table('resources')
    op.drop_table('readiness_snapshots')
    op.drop_table('path_versions')
    op.drop_table('assessment_attempts')
    op.drop_table('assessment_items')
    op.drop_table('diagnostic_turns')
    op.drop_table('diagnostic_sessions')
    op.drop_table('goals')
    op.drop_table('learner_profiles')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_clerk_id'), table_name='users')
    op.drop_table('users')
    op.execute('DROP EXTENSION IF EXISTS vector')
