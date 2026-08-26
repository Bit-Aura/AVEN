"""
Revision ID: 0006
Revises: 0005
Create Date: 2026-08-26 16:30:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0006'
down_revision: Union[str, None] = '0005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'mentor_session_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('profile_id', sa.Integer(), nullable=False),
        sa.Column('mentor_id', sa.Integer(), nullable=True),
        sa.Column('skill_id', sa.String(length=255), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='OPEN'),
        sa.Column('requested_duration_minutes', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('meeting_room_id', sa.String(length=255), nullable=True),
        sa.Column('meeting_url', sa.String(length=512), nullable=True),
        sa.Column('mentor_notes', sa.Text(), nullable=True),
        sa.Column('recommendations', sa.Text(), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['profile_id'], ['learner_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['mentor_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_mentor_session_requests_profile_id', 'mentor_session_requests', ['profile_id'])
    op.create_index('ix_mentor_session_requests_mentor_id', 'mentor_session_requests', ['mentor_id'])
    op.create_index('ix_mentor_session_requests_skill_id', 'mentor_session_requests', ['skill_id'])
    op.create_index('ix_mentor_session_requests_status', 'mentor_session_requests', ['status'])

def downgrade() -> None:
    op.drop_index('ix_mentor_session_requests_status', table_name='mentor_session_requests')
    op.drop_index('ix_mentor_session_requests_skill_id', table_name='mentor_session_requests')
    op.drop_index('ix_mentor_session_requests_mentor_id', table_name='mentor_session_requests')
    op.drop_index('ix_mentor_session_requests_profile_id', table_name='mentor_session_requests')
    op.drop_table('mentor_session_requests')
