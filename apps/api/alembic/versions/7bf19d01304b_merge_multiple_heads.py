"""merge multiple heads

Revision ID: 7bf19d01304b
Revises: 0008, 0012
Create Date: 2026-08-28 22:01:32.275754

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7bf19d01304b'
down_revision: Union[str, None] = ('0008', '0012')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
