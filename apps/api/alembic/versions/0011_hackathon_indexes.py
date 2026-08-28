"""
Hackathon Events Read Query Indexes

Revision ID: 0011
Revises: 0010
Create Date: 2026-08-28 12:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0011'
down_revision: Union[str, None] = '0010'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(op.f('ix_hackathon_events_event_start_date'), 'hackathon_events', ['event_start_date'], unique=False)
    op.create_index(op.f('ix_hackathon_events_registration_deadline'), 'hackathon_events', ['registration_deadline'], unique=False)
    op.create_index(op.f('ix_hackathon_events_mode'), 'hackathon_events', ['mode'], unique=False)
    op.create_index(op.f('ix_hackathon_events_city'), 'hackathon_events', ['city'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_hackathon_events_city'), table_name='hackathon_events')
    op.drop_index(op.f('ix_hackathon_events_mode'), table_name='hackathon_events')
    op.drop_index(op.f('ix_hackathon_events_registration_deadline'), table_name='hackathon_events')
    op.drop_index(op.f('ix_hackathon_events_event_start_date'), table_name='hackathon_events')
