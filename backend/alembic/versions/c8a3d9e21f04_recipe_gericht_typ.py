"""recipe gericht_typ (meal type)

Revision ID: c8a3d9e21f04
Revises: a1f2e3d4c5b6
Create Date: 2026-07-12 13:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8a3d9e21f04'
down_revision: Union[str, Sequence[str], None] = 'a1f2e3d4c5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('recipes', schema=None) as batch_op:
        batch_op.add_column(sa.Column('gericht_typ', sa.String(length=64), server_default='', nullable=False))
        batch_op.create_index(batch_op.f('ix_recipes_gericht_typ'), ['gericht_typ'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('recipes', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_recipes_gericht_typ'))
        batch_op.drop_column('gericht_typ')
