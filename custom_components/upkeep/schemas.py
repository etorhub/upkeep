"""Voluptuous schemas for Upkeep task mutations.

These schemas do not import Home Assistant so unit tests can load them.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol

TASK_TYPES = ("time", "frequency")
INTERVAL_TYPES = ("days", "weeks", "months")
NOTIFY_UNITS = ("days", "weeks", "months")

# Written by the coordinator. Public updates must not set them.
INTERNAL_TASK_FIELDS = (
    "notified_before_due",
    "notified_due_on",
    "notified_frequency_due",
)


def strict_int(value: Any) -> int:
    """Accept an int and reject booleans, which are ints in Python."""
    if isinstance(value, bool) or not isinstance(value, int):
        raise vol.Invalid("expected an integer")
    return value


def positive_int(value: Any) -> int:
    """Accept an int of at least 1."""
    number = strict_int(value)
    if number < 1:
        raise vol.Invalid("expected an integer of at least 1")
    return number


def require_task_ref(data: dict[str, Any]) -> dict[str, Any]:
    """Require entity_id or task_id."""
    if not data.get("entity_id") and not data.get("task_id"):
        raise vol.Invalid("entity_id or task_id is required")
    return data


_OPTIONAL_TEXT = vol.Any(None, str)

# Fields a caller may omit. Update keeps them absent; create fills defaults below.
_SETTABLE_FIELDS: dict[Any, Any] = {
    vol.Optional("description"): _OPTIONAL_TEXT,
    vol.Optional("task_type"): vol.In(TASK_TYPES),
    vol.Optional("interval_value"): strict_int,
    vol.Optional("interval_type"): vol.In(INTERVAL_TYPES),
    vol.Optional("last_performed"): _OPTIONAL_TEXT,
    vol.Optional("tag_id"): _OPTIONAL_TEXT,
    vol.Optional("icon"): _OPTIONAL_TEXT,
    vol.Optional("assigned_user"): _OPTIONAL_TEXT,
    vol.Optional("frequency_target"): vol.Any(None, strict_int),
    vol.Optional("current_count"): strict_int,
    vol.Optional("watched_entity"): _OPTIONAL_TEXT,
    vol.Optional("notify_when_due"): bool,
    vol.Optional("notify_before"): bool,
    vol.Optional("notify_before_value"): positive_int,
    vol.Optional("notify_before_unit"): vol.In(NOTIFY_UNITS),
    vol.Optional("notify_service"): _OPTIONAL_TEXT,
    vol.Optional("labels"): [str],
}

_UPDATE_FIELDS: dict[Any, Any] = {
    vol.Optional("title"): str,
    vol.Optional("enabled"): bool,
    vol.Optional("snoozed_until"): _OPTIONAL_TEXT,
    **_SETTABLE_FIELDS,
}

TASK_UPDATE_SCHEMA = vol.Schema(_UPDATE_FIELDS)

CREATE_TASK_SCHEMA = vol.Schema(
    {
        vol.Required("title"): str,
        vol.Optional("description"): _OPTIONAL_TEXT,
        vol.Optional("task_type", default="time"): vol.In(TASK_TYPES),
        vol.Optional("interval_value", default=30): strict_int,
        vol.Optional("interval_type", default="days"): vol.In(INTERVAL_TYPES),
        vol.Optional("last_performed"): _OPTIONAL_TEXT,
        vol.Optional("tag_id"): _OPTIONAL_TEXT,
        vol.Optional("icon"): _OPTIONAL_TEXT,
        vol.Optional("assigned_user"): _OPTIONAL_TEXT,
        vol.Optional("frequency_target"): vol.Any(None, strict_int),
        vol.Optional("current_count", default=0): strict_int,
        vol.Optional("watched_entity"): _OPTIONAL_TEXT,
        vol.Optional("notify_when_due", default=False): bool,
        vol.Optional("notify_before", default=False): bool,
        vol.Optional("notify_before_value", default=7): positive_int,
        vol.Optional("notify_before_unit", default="days"): vol.In(NOTIFY_UNITS),
        vol.Optional("notify_service"): _OPTIONAL_TEXT,
        vol.Optional("labels", default=list): [str],
    }
)

TASK_REF_SCHEMA = vol.Schema(
    vol.All(
        {
            vol.Optional("entity_id"): str,
            vol.Optional("task_id"): str,
        },
        require_task_ref,
    )
)

_REF_FIELDS: dict[Any, Any] = {
    vol.Optional("entity_id"): str,
    vol.Optional("task_id"): str,
}


def _service_schema(fields: dict[Any, Any]) -> vol.Schema:
    """Build a service schema that requires one task identifier."""
    return vol.Schema(vol.All({**_REF_FIELDS, **fields}, require_task_ref))


ADD_TASK_SERVICE_SCHEMA = CREATE_TASK_SCHEMA
UPDATE_TASK_SERVICE_SCHEMA = vol.Schema(
    vol.All({**_REF_FIELDS, **_UPDATE_FIELDS}, require_task_ref)
)
REMOVE_TASK_SCHEMA = TASK_REF_SCHEMA
COMPLETE_TASK_SCHEMA = _service_schema(
    {vol.Optional("performed_date"): str}
)
SNOOZE_TASK_SCHEMA = _service_schema(
    {
        vol.Optional("snooze_until"): str,
        vol.Optional("disable"): bool,
    }
)
ENABLE_TASK_SCHEMA = TASK_REF_SCHEMA
INCREMENT_COUNTER_SCHEMA = TASK_REF_SCHEMA
