"""Who is asking? Signed-in players send their Supabase access token; guests send a random device id.

If SUPABASE_JWT_SECRET is set, tokens are verified (HS256, audience "authenticated") and the user id is the token's `sub`.
Guests are namespaced as "guest:<uuid>" so the two can never collide.
"""
from __future__ import annotations

import os
import re

import jwt
from fastapi import Header, HTTPException

GUEST_RE = re.compile(r"^[0-9a-f-]{16,64}$")


def current_user(authorization: str | None = Header(default=None), x_fodder_guest: str | None = Header(default=None)) -> str:
    secret = os.environ.get("SUPABASE_JWT_SECRET")
    if authorization and authorization.lower().startswith("bearer ") and secret:
        token = authorization.split(" ", 1)[1]
        try:
            claims = jwt.decode(token, secret, algorithms=["HS256"], audience="authenticated")
        except jwt.PyJWTError as e:
            raise HTTPException(status_code=401, detail="Invalid session") from e
        return f"user:{claims['sub']}"
    if x_fodder_guest and GUEST_RE.match(x_fodder_guest.lower()):
        return f"guest:{x_fodder_guest.lower()}"
    raise HTTPException(status_code=401, detail="Send a session token or a guest id")
