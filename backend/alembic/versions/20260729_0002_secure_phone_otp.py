"""Secure phone OTP state.

Revision ID: 20260729_0002
Revises: 20260727_0001
"""

from typing import Optional, Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260729_0002"
down_revision: Optional[str] = "20260727_0001"
branch_labels: Optional[Union[str, Sequence[str]]] = None
depends_on: Optional[Union[str, Sequence[str]]] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "otp_attempt_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "otp_last_sent_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    # Invalidate legacy plaintext OTPs instead of preserving sensitive data.
    op.execute(
        "UPDATE users "
        "SET otp_code = NULL, otp_expires_at = NULL"
    )


def downgrade() -> None:
    op.drop_column("users", "otp_last_sent_at")
    op.drop_column("users", "otp_attempt_count")
