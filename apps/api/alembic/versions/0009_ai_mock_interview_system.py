"""
AI Mock Interview System & Resume Pipeline Migration

Revision ID: 0009
Revises: 9b49af42f54d
Create Date: 2026-08-27 20:30:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0009'
down_revision: Union[str, None] = '9b49af42f54d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Create learner_resumes table
    op.create_table(
        'learner_resumes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('profile_id', sa.Integer(), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('content_type', sa.String(length=100), nullable=False),
        sa.Column('storage_path', sa.String(length=512), nullable=True),
        sa.Column('raw_text', sa.Text(), nullable=False),
        sa.Column('parsed_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['profile_id'], ['learner_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_learner_resumes_profile_id', 'learner_resumes', ['profile_id'])

    # 2. Create mock_interview_sessions table
    op.create_table(
        'mock_interview_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('profile_id', sa.Integer(), nullable=False),
        sa.Column('resume_id', sa.Integer(), nullable=True),
        sa.Column('target_role', sa.String(length=255), nullable=False),
        sa.Column('interview_type', sa.String(length=50), nullable=False, server_default='COMPREHENSIVE'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='IN_PROGRESS'),
        sa.Column('current_phase', sa.String(length=50), nullable=False, server_default='INTRODUCTION'),
        sa.Column('current_turn_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('context_snapshot', sa.JSON(), nullable=True),
        sa.Column('overall_score', sa.Float(), nullable=True),
        sa.Column('technical_score', sa.Float(), nullable=True),
        sa.Column('communication_score', sa.Float(), nullable=True),
        sa.Column('resume_verification_score', sa.Float(), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('feedback_summary', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['profile_id'], ['learner_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['resume_id'], ['learner_resumes.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_mock_interview_sessions_profile_id', 'mock_interview_sessions', ['profile_id'])
    op.create_index('ix_mock_interview_sessions_resume_id', 'mock_interview_sessions', ['resume_id'])
    op.create_index('ix_mock_interview_sessions_status', 'mock_interview_sessions', ['status'])

    # 3. Create mock_interview_turns table
    op.create_table(
        'mock_interview_turns',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('turn_index', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False, server_default='TECHNICAL_FUNDAMENTALS'),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('expected_rubrics', sa.JSON(), nullable=True),
        sa.Column('learner_answer', sa.Text(), nullable=True),
        sa.Column('input_mode', sa.String(length=20), nullable=False, server_default='TEXT'),
        sa.Column('evaluation_data', sa.JSON(), nullable=True),
        sa.Column('answer_score', sa.Float(), nullable=True),
        sa.Column('detected_gap_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['mock_interview_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_mock_interview_turns_session_id', 'mock_interview_turns', ['session_id'])

def downgrade() -> None:
    op.drop_index('ix_mock_interview_turns_session_id', table_name='mock_interview_turns')
    op.drop_table('mock_interview_turns')

    op.drop_index('ix_mock_interview_sessions_status', table_name='mock_interview_sessions')
    op.drop_index('ix_mock_interview_sessions_resume_id', table_name='mock_interview_sessions')
    op.drop_index('ix_mock_interview_sessions_profile_id', table_name='mock_interview_sessions')
    op.drop_table('mock_interview_sessions')

    op.drop_index('ix_learner_resumes_profile_id', table_name='learner_resumes')
    op.drop_table('learner_resumes')
