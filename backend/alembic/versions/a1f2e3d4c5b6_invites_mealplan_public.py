"""invites + meal_plan tables, recipes.public_listed

Revision ID: a1f2e3d4c5b6
Revises: 40be5d258d4d
"""

import sqlalchemy as sa
from alembic import op

revision = "a1f2e3d4c5b6"
down_revision = "40be5d258d4d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "invites",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(16), nullable=False),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("used_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_invites_code", "invites", ["code"], unique=True)
    op.create_index("ix_invites_created_by", "invites", ["created_by"])

    op.create_table(
        "meal_plan",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("datum", sa.String(10), nullable=False),
        sa.Column("recipe_id", sa.Integer(), sa.ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "datum", "recipe_id", name="uq_mealplan_user_day_recipe"),
    )
    op.create_index("ix_meal_plan_user_id", "meal_plan", ["user_id"])
    op.create_index("ix_meal_plan_datum", "meal_plan", ["datum"])
    op.create_index("ix_meal_plan_recipe_id", "meal_plan", ["recipe_id"])

    op.add_column("recipes", sa.Column("public_listed", sa.Boolean(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("recipes", "public_listed")
    op.drop_table("meal_plan")
    op.drop_table("invites")
