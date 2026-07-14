"""app_settings.open_signup (runtime-editable registration gate)

Revision ID: a9c3f1e6b722
Revises: f7b2c9d4e810
Create Date: 2026-07-14 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a9c3f1e6b722'
down_revision: Union[str, Sequence[str], None] = 'f7b2c9d4e810'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # server_default '1' (open) matches the config default, so any pre-existing
    # singleton row (created by an earlier limit edit) stays on open signup.
    with op.batch_alter_table('app_settings', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('open_signup', sa.Boolean(), server_default='1', nullable=False)
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('app_settings', schema=None) as batch_op:
        batch_op.drop_column('open_signup')
