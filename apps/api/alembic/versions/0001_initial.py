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
    # TODO: generate actual table creations via autogenerate once DB is up
    pass

def downgrade() -> None:
    # TODO: drop tables
    pass
