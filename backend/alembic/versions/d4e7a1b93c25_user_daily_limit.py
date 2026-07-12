"""user daily_limit (per-user generation cap)

Revision ID: d4e7a1b93c25
Revises: c8a3d9e21f04
Create Date: 2026-07-12 14:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e7a1b93c25'
down_revision: Union[str, Sequence[str], None] = 'c8a3d9e21f04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema. Existing users keep NULL -> global default (20)."""
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('daily_limit', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('daily_limit')
