"""
Supabase client setup.

Initializes a single shared Supabase client using the service role key,
which bypasses Row Level Security for server-side operations.
"""

import os
from functools import lru_cache

from supabase import Client, create_client


@lru_cache
def get_supabase() -> Client:
    """Return the cached Supabase client, creating it on first call."""
    url: str = os.environ["SUPABASE_URL"]
    key: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)
