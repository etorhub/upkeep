"""Shared create and update preparation for services and websocket commands."""

from __future__ import annotations

import uuid
from typing import Any

import voluptuous as vol
from homeassistant.util import dt as dt_util

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
        last_performed = (
            dt_util.now().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        )

    notice_error = validate_notice_updates(parsed)
    if notice_error:
        raise ValueError(notice_error)

    task = UpkeepTask(
        id=f"upkeep_{uuid.uuid4().hex}",
        title=parsed["title"],
        description=parsed.get("description"),
        task_type=parsed["task_type"],
        interval_value=parsed["interval_value"],
        interval_type=parsed["interval_type"],
        last_performed=last_performed,
        tag_id=parsed.get("tag_id"),
        icon=parsed.get("icon"),
        assigned_user=parsed.get("assigned_user"),
        frequency_target=parsed.get("frequency_target"),
        current_count=parsed["current_count"],
        watched_entity=parsed.get("watched_entity"),
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
        parsed["last_performed"] = last_performed or (
            dt_util.now().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        )

    notice_error = validate_notice_updates(parsed)
    if notice_error:
        raise ValueError(notice_error)
    return parsed
