"""
Revision ID: 0003
Revises: 0002
Create Date: 2026-08-24 22:30:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Add fields to users table
    op.add_column('users', sa.Column('name', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('role', sa.String(length=50), nullable=False, server_default='learner'))
    op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))

    # 2. Create mentor_applications table
    op.create_table(
        'mentor_applications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('expertise', sa.String(length=255), nullable=False),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('linkedin_url', sa.String(length=512), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 3. Add fields to resources table
    op.add_column('resources', sa.Column('resource_type', sa.String(length=50), nullable=False, server_default='tutorial'))
    op.add_column('resources', sa.Column('skill_id', sa.String(length=255), nullable=True))
    op.add_column('resources', sa.Column('submitted_by_id', sa.Integer(), nullable=True))
    op.add_column('resources', sa.Column('status', sa.String(length=50), nullable=False, server_default='APPROVED'))
    op.add_column('resources', sa.Column('rejection_reason', sa.Text(), nullable=True))
    op.add_column('resources', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.create_foreign_key('fk_resources_submitted_by', 'resources', 'users', ['submitted_by_id'], ['id'], ondelete='SET NULL')

def downgrade() -> None:
    op.drop_constraint('fk_resources_submitted_by', 'resources', type_='foreignkey')
    op.drop_column('resources', 'updated_at')
    op.drop_column('resources', 'rejection_reason')
    op.drop_column('resources', 'status')
    op.drop_column('resources', 'submitted_by_id')
    op.drop_column('resources', 'skill_id')
    op.drop_column('resources', 'resource_type')
    op.drop_table('mentor_applications')
    op.drop_column('users', 'is_active')
    op.drop_column('users', 'role')
    op.drop_column('users', 'name')
