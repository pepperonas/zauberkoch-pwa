"""recipe soft delete (deleted_at)

Revision ID: f7b2c9d4e810
Revises: e5f1c2a7b304
Create Date: 2026-07-14 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7b2c9d4e810'
down_revision: Union[str, Sequence[str], None] = 'e5f1c2a7b304'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('recipes', schema=None) as batch_op:
        batch_op.add_column(sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('recipes', schema=None) as batch_op:
        batch_op.drop_column('deleted_at')
