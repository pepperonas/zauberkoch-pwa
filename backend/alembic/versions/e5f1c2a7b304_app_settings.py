"""app_settings singleton (runtime-editable system limits)

Revision ID: e5f1c2a7b304
Revises: d4e7a1b93c25
Create Date: 2026-07-14 12:00:00.000000

No seed row: when absent the app falls back to config defaults, so the row is
created only once an admin edits a limit in the panel.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f1c2a7b304'
down_revision: Union[str, Sequence[str], None] = 'd4e7a1b93c25'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'app_settings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('default_user_limit', sa.Integer(), nullable=False),
        sa.Column('global_daily_limit', sa.Integer(), nullable=False),
        sa.Column('registration_daily_limit', sa.Integer(), nullable=False),
        sa.Column('anon_ip_limit', sa.Integer(), nullable=False),
        sa.Column('anon_global_limit', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('app_settings')
