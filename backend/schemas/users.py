"""
Pydantic schemas for user-related API responses.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class UserPlan(BaseModel):
    plan: Literal["free", "pro"]
    stripe_customer_id: str | None
