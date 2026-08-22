"""
Revision ID: 0002
Revises: 0001
Create Date: 2026-08-22 22:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import pgvector.sqlalchemy

revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'skills',
        sa.Column('id', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('bkt_p_l0', sa.Float(), nullable=False, server_default='0.15'),
        sa.Column('bkt_p_t', sa.Float(), nullable=False, server_default='0.20'),
        sa.Column('bkt_p_s', sa.Float(), nullable=False, server_default='0.10'),
        sa.Column('bkt_p_g', sa.Float(), nullable=False, server_default='0.20'),
        sa.Column('embedding', pgvector.sqlalchemy.Vector(dim=384), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_skills_name'), 'skills', ['name'], unique=True)

def downgrade() -> None:
    op.drop_index(op.f('ix_skills_name'), table_name='skills')
    op.drop_table('skills')
