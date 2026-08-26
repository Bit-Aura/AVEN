"""
Revision ID: 0004
Revises: 0003
Create Date: 2026-08-26 12:40:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0004'
down_revision: Union[str, None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'coding_sandbox_submissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('profile_id', sa.Integer(), nullable=True),
        sa.Column('node_id', sa.String(length=255), nullable=False),
        sa.Column('question_id', sa.String(length=255), nullable=True),
        sa.Column('problem_title', sa.String(length=255), nullable=True),
        sa.Column('language', sa.String(length=50), nullable=False),
        sa.Column('submitted_code', sa.Text(), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('verdict', sa.String(length=50), nullable=False),
        sa.Column('is_passing', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('evaluation_result', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['profile_id'], ['learner_profiles.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_coding_sandbox_submissions_node_id', 'coding_sandbox_submissions', ['node_id'])
    op.create_index('ix_coding_sandbox_submissions_profile_id', 'coding_sandbox_submissions', ['profile_id'])

def downgrade() -> None:
    op.drop_index('ix_coding_sandbox_submissions_profile_id', table_name='coding_sandbox_submissions')
    op.drop_index('ix_coding_sandbox_submissions_node_id', table_name='coding_sandbox_submissions')
    op.drop_table('coding_sandbox_submissions')
