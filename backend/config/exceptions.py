"""
config/exceptions.py
--------------------
Wraps DRF's default exception handler so every error response
from the API has a predictable shape:

    {
        "error": {
            "code": "authentication_failed",
            "message": "Given token not valid for any token type",
            "detail": { ... }   ← only present when DRF sends structured detail
        }
    }

Why a custom handler?
DRF's default responses vary between:
  - {"detail": "..."}         (authentication / permission errors)
  - {"field": ["error"]}      (validation errors)
  - raw strings in some edge cases

A consistent shape means the React frontend can always do:
  error.response.data.error.message
without branching on status code.
"""

import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response

logger = logging.getLogger("barbershop")


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        # Unhandled server error — log it, return generic 500.
        logger.exception("Unhandled exception in view %s", context.get("view"))
        return Response(
            {"error": {"code": "server_error", "message": "An unexpected error occurred."}},
            status=500,
        )

    detail = response.data

    # Flatten DRF's "detail" key into our envelope.
    if isinstance(detail, dict) and "detail" in detail:
        message = str(detail["detail"])
        code = getattr(detail["detail"], "code", "error")
        response.data = {"error": {"code": code, "message": message}}
    else:
        # Validation errors: field-level dict or list.
        response.data = {
            "error": {
                "code": "validation_error",
                "message": "Invalid input.",
                "detail": detail,
            }
        }

    return response
