"""
Billing endpoints (Stripe integration).

POST /api/billing/checkout  → create Stripe Checkout Session
POST /api/billing/webhook   → handle Stripe webhook (verify signature → update plan)
GET  /api/billing/portal    → create Stripe Customer Portal session
"""

from __future__ import annotations

import os

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from gotrue.types import User
from supabase import Client

from database import get_supabase
from dependencies.auth import get_current_user

router = APIRouter(prefix="/api/billing", tags=["billing"])

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
_WEBHOOK_SECRET: str = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
_SUCCESS_URL: str = os.environ.get(
    "STRIPE_SUCCESS_URL", "http://localhost:3000/ja/billing?success=true"
)
_CANCEL_URL: str = os.environ.get(
    "STRIPE_CANCEL_URL", "http://localhost:3000/ja/billing"
)
_PRICE_ID: str = os.environ.get("STRIPE_PRICE_ID", "")  # Monthly Pro price ID


@router.post("/checkout")
async def create_checkout(
    user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
) -> dict:
    """Create a Stripe Checkout Session for the Pro plan."""
    user_id: str = str(user.id)

    # Fetch or create Stripe customer ID from users table.
    user_row = (
        supabase.table("users")
        .select("stripe_customer_id, email")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not user_row.data:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "User not found."},
        )

    customer_id: str | None = user_row.data.get("stripe_customer_id")
    email: str = user_row.data.get("email", "")

    if not customer_id:
        customer = stripe.Customer.create(
            email=email,
            metadata={"supabase_user_id": user_id},
        )
        customer_id = customer.id
        supabase.table("users").update({"stripe_customer_id": customer_id}).eq(
            "id", user_id
        ).execute()

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": _PRICE_ID, "quantity": 1}],
        mode="subscription",
        success_url=_SUCCESS_URL,
        cancel_url=_CANCEL_URL,
        metadata={"supabase_user_id": user_id},
    )

    return {"url": session.url}


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(..., alias="stripe-signature"),
    supabase: Client = Depends(get_supabase),
) -> dict:
    """Handle Stripe webhook events.

    Signature verification is the primary security control — always verify before processing.
    """
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, _WEBHOOK_SECRET)
    except stripe.SignatureVerificationError:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_REQUEST", "message": "Invalid Stripe signature."},
        )
    except Exception:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_REQUEST", "message": "Webhook payload error."},
        )

    event_type: str = event["type"]

    if event_type == "checkout.session.completed":
        session_obj = event["data"]["object"]
        supabase_user_id = session_obj.get("metadata", {}).get("supabase_user_id")
        if supabase_user_id:
            supabase.table("users").update({"plan": "pro"}).eq(
                "id", supabase_user_id
            ).execute()

    elif event_type in ("customer.subscription.deleted", "customer.subscription.paused"):
        # Downgrade to free when subscription ends or is paused.
        subscription = event["data"]["object"]
        customer_id = subscription.get("customer")
        if customer_id:
            supabase.table("users").update({"plan": "free"}).eq(
                "stripe_customer_id", customer_id
            ).execute()

    return {"received": True}


@router.get("/portal")
async def create_portal(
    user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
) -> dict:
    """Create a Stripe Customer Portal session for subscription management."""
    user_id: str = str(user.id)

    user_row = (
        supabase.table("users")
        .select("stripe_customer_id")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not user_row.data or not user_row.data.get("stripe_customer_id"):
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "No billing account found."},
        )

    portal_session = stripe.billing_portal.Session.create(
        customer=user_row.data["stripe_customer_id"],
        return_url=_CANCEL_URL,
    )

    return {"url": portal_session.url}
