"""Create the initial Tat-Sahayk database schema.

Revision ID: 20260727_0001
Revises:
"""

from typing import Optional, Sequence, Union

from alembic import op
from geoalchemy2 import Geometry
import sqlalchemy as sa


revision: str = "20260727_0001"
down_revision: Optional[str] = None
branch_labels: Optional[Union[str, Sequence[str]]] = None
depends_on: Optional[Union[str, Sequence[str]]] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=True),
        sa.Column("district", sa.String(), nullable=True),
        sa.Column("state", sa.String(), nullable=True),
        sa.Column("profile_photo", sa.String(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("phone_verified", sa.Boolean(), nullable=True),
        sa.Column("otp_code", sa.String(), nullable=True),
        sa.Column(
            "otp_expires_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index(
        "ix_users_email",
        "users",
        ["email"],
        unique=True,
    )

    op.create_table(
        "social_posts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(), nullable=True),
        sa.Column("author", sa.String(), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("url", sa.String(), nullable=True),
        sa.Column(
            "published_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_social_posts_id",
        "social_posts",
        ["id"],
    )

    op.create_table(
        "shelters",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("address", sa.Text(), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("current_occupancy", sa.Integer(), nullable=True),
        sa.Column(
            "contact_phone",
            sa.String(length=20),
            nullable=True,
        ),
        sa.Column(
            "contact_person",
            sa.String(length=100),
            nullable=True,
        ),
        sa.Column("facilities", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True),
        sa.Column(
            "district",
            sa.String(length=100),
            nullable=True,
        ),
        sa.Column("state", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_shelters_id", "shelters", ["id"])

    op.create_table(
        "map_annotations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("admin_id", sa.Integer(), nullable=True),
        sa.Column("type", sa.String(), nullable=True),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("radius_km", sa.Float(), nullable=True),
        sa.Column("district", sa.String(), nullable=True),
        sa.Column("state", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["admin_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_map_annotations_id",
        "map_annotations",
        ["id"],
    )

    op.create_table(
        "deployed_forces",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("admin_id", sa.Integer(), nullable=True),
        sa.Column("unit_name", sa.String(), nullable=True),
        sa.Column("force_type", sa.String(), nullable=True),
        sa.Column("personnel_count", sa.Integer(), nullable=True),
        sa.Column("equipment", sa.Text(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("district", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column(
            "deployed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(["admin_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_deployed_forces_id",
        "deployed_forces",
        ["id"],
    )

    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("hazard_type", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(), nullable=True),
        sa.Column(
            "location",
            Geometry(
                geometry_type="POINT",
                srid=4326,
                spatial_index=False,
            ),
            nullable=True,
        ),
        sa.Column("is_verified", sa.Boolean(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "confirmation_count",
            sa.Integer(),
            nullable=True,
        ),
        sa.Column(
            "ai_authenticity_score",
            sa.Float(),
            nullable=True,
        ),
        sa.Column(
            "ai_analysis_summary",
            sa.String(),
            nullable=True,
        ),
        sa.Column(
            "ai_analysis_breakdown",
            sa.Text(),
            nullable=True,
        ),
        sa.Column("district", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reports_id", "reports", ["id"])
    op.create_index(
        "idx_reports_location",
        "reports",
        ["location"],
        postgresql_using="gist",
    )

    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("admin_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("hazard_type", sa.String(), nullable=True),
        sa.Column("severity", sa.String(), nullable=True),
        sa.Column("district", sa.String(), nullable=True),
        sa.Column("state", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "expires_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["admin_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_alerts_id", "alerts", ["id"])

    op.create_table(
        "media",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("report_id", sa.Integer(), nullable=True),
        sa.Column("file_path", sa.String(), nullable=False),
        sa.Column("file_type", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["report_id"], ["reports.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_media_id", "media", ["id"])

    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("report_id", sa.Integer(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["parent_id"],
            ["comments.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["report_id"],
            ["reports.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_comments_id", "comments", ["id"])

    op.create_table(
        "report_confirmations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("report_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["report_id"], ["reports.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "report_id",
            "user_id",
            name="unique_user_report_confirmation",
        ),
    )
    op.create_index(
        "ix_report_confirmations_id",
        "report_confirmations",
        ["id"],
    )

    op.create_table(
        "rescue_deployments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("report_id", sa.Integer(), nullable=True),
        sa.Column(
            "team_name",
            sa.String(length=200),
            nullable=False,
        ),
        sa.Column("unit_count", sa.Integer(), nullable=False),
        sa.Column("personnel_count", sa.Integer(), nullable=True),
        sa.Column("equipment", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("deployed_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["report_id"], ["reports.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_rescue_deployments_id",
        "rescue_deployments",
        ["id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_rescue_deployments_id",
        table_name="rescue_deployments",
    )
    op.drop_table("rescue_deployments")

    op.drop_index(
        "ix_report_confirmations_id",
        table_name="report_confirmations",
    )
    op.drop_table("report_confirmations")

    op.drop_index("ix_comments_id", table_name="comments")
    op.drop_table("comments")

    op.drop_index("ix_media_id", table_name="media")
    op.drop_table("media")

    op.drop_index("ix_alerts_id", table_name="alerts")
    op.drop_table("alerts")

    op.drop_index(
        "idx_reports_location",
        table_name="reports",
        postgresql_using="gist",
    )
    op.drop_index("ix_reports_id", table_name="reports")
    op.drop_table("reports")

    op.drop_index(
        "ix_deployed_forces_id",
        table_name="deployed_forces",
    )
    op.drop_table("deployed_forces")

    op.drop_index(
        "ix_map_annotations_id",
        table_name="map_annotations",
    )
    op.drop_table("map_annotations")

    op.drop_index("ix_shelters_id", table_name="shelters")
    op.drop_table("shelters")

    op.drop_index(
        "ix_social_posts_id",
        table_name="social_posts",
    )
    op.drop_table("social_posts")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")