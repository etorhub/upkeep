"""Shared create and update preparation for services and websocket commands."""

from __future__ import annotations

import uuid
from typing import Any

import voluptuous as vol
from homeassistant.util import dt as dt_util

from .meters import fresh_state, public_task_type, trigger_from_legacy, validate_trigger
from .notices import validate_notice_updates
from .schemas import CREATE_TASK_SCHEMA, INTERNAL_TASK_FIELDS, TASK_UPDATE_SCHEMA
from .store import UpkeepTask


def _schema_error(err: vol.MultipleInvalid) -> ValueError:
    return ValueError(str(err))


def parse_last_performed(last_str: str | None) -> str | None:
    """Parse last_performed to an ISO string at local midnight."""
    if not last_str:
        return None
    parsed = dt_util.parse_datetime(last_str)
    if parsed is None:
        return None
    parsed_local = dt_util.as_local(parsed)
    return parsed_local.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()


def _today_iso() -> str:
    """Return today's local midnight as an ISO timestamp."""
    return dt_util.now().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()


def new_task_from_data(data: dict[str, Any]) -> tuple[UpkeepTask, list[str]]:
    """Validate a create payload and return the task plus its labels."""
    try:
        parsed = CREATE_TASK_SCHEMA(data)
    except vol.MultipleInvalid as err:
        raise _schema_error(err) from err

    last_str = parsed.get("last_performed")
    last_performed = parse_last_performed(last_str)
    if last_str and last_performed is None:
        raise ValueError(f"Could not parse date: {last_str}")
    if last_performed is None:
        last_performed = _today_iso()

    notice_error = validate_notice_updates(parsed)
    if notice_error:
        raise ValueError(notice_error)

    if parsed.get("trigger"):
        trigger = parsed["trigger"]
        errors = validate_trigger(trigger)
        if errors:
            raise ValueError(errors[0])
        state = dict(parsed.get("state") or fresh_state(trigger))
    else:
        legacy = dict(parsed)
        if parsed.get("task_type", "time") == "frequency":
            legacy["last_performed"] = None
        else:
            legacy["last_performed"] = last_performed or _today_iso()
        trigger, state = trigger_from_legacy(legacy)

    if trigger.get("type") == "interval" and not state.get("last_performed"):
        state["last_performed"] = (_today_iso())[:10]

    task = UpkeepTask(
        id=f"upkeep_{uuid.uuid4().hex}",
        title=parsed["title"],
        description=parsed.get("description"),
        task_type=public_task_type(trigger.get("type", ""), parsed.get("task_type")),
        trigger=trigger,
        state=state,
        tag_id=parsed.get("tag_id"),
        icon=parsed.get("icon"),
        assigned_user=parsed.get("assigned_user"),
        notify_when_due=parsed["notify_when_due"],
        notify_before=parsed["notify_before"],
        notify_before_value=parsed["notify_before_value"],
        notify_before_unit=parsed["notify_before_unit"],
        notify_service=parsed.get("notify_service"),
    )
    return task, list(parsed.get("labels") or [])


def prepare_updates(updates: dict[str, Any]) -> dict[str, Any]:
    """Validate an update payload and normalize dates and notice targets."""
    cleaned = {
        key: value
        for key, value in updates.items()
        if key not in INTERNAL_TASK_FIELDS
    }
    try:
        parsed = TASK_UPDATE_SCHEMA(cleaned)
    except vol.MultipleInvalid as err:
        raise _schema_error(err) from err

    if "last_performed" in parsed:
        last_str = parsed["last_performed"]
        last_performed = parse_last_performed(last_str)
        if last_str and last_performed is None:
            raise ValueError(f"Could not parse date: {last_str}")
        parsed["last_performed"] = last_performed or _today_iso()

    if "trigger" in parsed:
        errors = validate_trigger(parsed["trigger"])
        if errors:
            raise ValueError(errors[0])

    notice_error = validate_notice_updates(parsed)
    if notice_error:
        raise ValueError(notice_error)
    return parsed
