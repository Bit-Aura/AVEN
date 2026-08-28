"""
Hackathon Events Subsystem Migration

Revision ID: 0010
Revises: 0009
Create Date: 2026-08-28 11:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0010'
down_revision: Union[str, None] = '0009'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'hackathon_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('external_id', sa.String(length=255), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=False),
        sa.Column('title', sa.String(length=512), nullable=False),
        sa.Column('organizer', sa.String(length=255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('url', sa.String(length=1024), nullable=True),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('city', sa.String(length=255), nullable=True),
        sa.Column('state', sa.String(length=255), nullable=True),
        sa.Column('country', sa.String(length=255), nullable=True),
        sa.Column('mode', sa.String(length=50), nullable=True, server_default='online'),
        sa.Column('prize_pool', sa.String(length=255), nullable=True),
        sa.Column('registration_deadline', sa.String(length=255), nullable=True),
        sa.Column('event_start_date', sa.String(length=255), nullable=True),
        sa.Column('event_end_date', sa.String(length=255), nullable=True),
        sa.Column('skills', sa.JSON(), nullable=True),
        sa.Column('cover_image', sa.String(length=1024), nullable=True),
        sa.Column('scraped_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source', 'external_id', name='uq_hackathon_event_source_extid')
    )
    op.create_index(op.f('ix_hackathon_events_external_id'), 'hackathon_events', ['external_id'], unique=False)
    op.create_index(op.f('ix_hackathon_events_source'), 'hackathon_events', ['source'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_hackathon_events_source'), table_name='hackathon_events')
    op.drop_index(op.f('ix_hackathon_events_external_id'), table_name='hackathon_events')
    op.drop_table('hackathon_events')
