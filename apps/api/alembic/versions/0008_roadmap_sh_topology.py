"""roadmap.sh canonical skill topology and caching tables

Revision ID: 0008
Revises: 0007
Create Date: 2026-08-27 19:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '0008'
down_revision = '9b49af42f54d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Update skills table
    with op.batch_alter_table('skills', schema=None) as batch_op:
        batch_op.add_column(sa.Column('source', sa.String(length=50), nullable=False, server_default='roadmap_sh'))
        batch_op.add_column(sa.Column('roadmap_slug', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('external_node_id', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('deprecated', sa.Boolean(), nullable=False, server_default=sa.text('false')))
        batch_op.create_index(batch_op.f('ix_skills_source'), ['source'], unique=False)
        batch_op.create_index(batch_op.f('ix_skills_roadmap_slug'), ['roadmap_slug'], unique=False)

    # 2. Update resources table
    with op.batch_alter_table('resources', schema=None) as batch_op:
        batch_op.add_column(sa.Column('source_roadmap_slug', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('source_node_id', sa.String(length=255), nullable=True))

    # 3. Create roadmap_cache table
    op.create_table(
        'roadmap_cache',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('raw_detail_json', sa.JSON(), nullable=True),
        sa.Column('clean_nodes_json', sa.JSON(), nullable=True),
        sa.Column('topics_json', sa.JSON(), nullable=True),
        sa.Column('fetched_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('source_updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('credits_spent', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_roadmap_cache_slug'), 'roadmap_cache', ['slug'], unique=True)

    # 4. Create roadmap_ingestion_conflicts table
    op.create_table(
        'roadmap_ingestion_conflicts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=True),
        sa.Column('conflict_type', sa.String(length=50), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('resolved', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_roadmap_ingestion_conflicts_slug'), 'roadmap_ingestion_conflicts', ['slug'], unique=False)
    op.create_index(op.f('ix_roadmap_ingestion_conflicts_conflict_type'), 'roadmap_ingestion_conflicts', ['conflict_type'], unique=False)
    op.create_index(op.f('ix_roadmap_ingestion_conflicts_resolved'), 'roadmap_ingestion_conflicts', ['resolved'], unique=False)

    # 5. Create role_roadmap_mappings table
    op.create_table(
        'role_roadmap_mappings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.String(length=100), nullable=False),
        sa.Column('roadmap_slug', sa.String(length=255), nullable=False),
        sa.Column('priority_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('role_id', 'roadmap_slug', name='uq_role_roadmap_mapping')
    )
    op.create_index(op.f('ix_role_roadmap_mappings_role_id'), 'role_roadmap_mappings', ['role_id'], unique=False)
    op.create_index(op.f('ix_role_roadmap_mappings_roadmap_slug'), 'role_roadmap_mappings', ['roadmap_slug'], unique=False)


def downgrade() -> None:
    op.drop_table('role_roadmap_mappings')
    op.drop_table('roadmap_ingestion_conflicts')
    op.drop_table('roadmap_cache')
    with op.batch_alter_table('resources', schema=None) as batch_op:
        batch_op.drop_column('source_node_id')
        batch_op.drop_column('source_roadmap_slug')
    with op.batch_alter_table('skills', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_skills_roadmap_slug'))
        batch_op.drop_index(batch_op.f('ix_skills_source'))
        batch_op.drop_column('deprecated')
        batch_op.drop_column('external_node_id')
        batch_op.drop_column('roadmap_slug')
        batch_op.drop_column('source')
