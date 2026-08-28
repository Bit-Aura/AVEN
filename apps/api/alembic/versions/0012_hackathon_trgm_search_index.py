"""
Hackathon Events Trigram Search Index Migration

Revision ID: 0012
Revises: 0011
Create Date: 2026-08-28 12:10:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0012'
down_revision: Union[str, None] = '0011'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.engine.name == 'postgresql':
        op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_hackathon_events_trgm_search ON hackathon_events "
            "USING gin ((title || ' ' || coalesce(description, '') || ' ' || coalesce(organizer, '')) gin_trgm_ops)"
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.engine.name == 'postgresql':
        op.execute("DROP INDEX IF EXISTS ix_hackathon_events_trgm_search")
