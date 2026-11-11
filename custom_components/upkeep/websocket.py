"""WebSocket commands for the Upkeep integration."""

import uuid
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.components.websocket_api import connection, messages
from homeassistant.core import HomeAssistant, callback
from homeassistant.util import dt as dt_util

from .const import DOMAIN
from .notices import NOTIFY_UNITS, validate_notice_updates
from .store import UpkeepTask


@callback
def websocket_get_tasks(
    hass: HomeAssistant,
    conn: connection.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Get all tasks."""
    store = hass.data.get(DOMAIN, {}).get("store")
    if not store:
        conn.send_error(msg["id"], "not_loaded", "Integration not loaded")
        return
    tasks = store.get_all()
    entities = hass.data.get(DOMAIN, {}).get("entities", {})
    for task in tasks:
        task_id = task.get("id")
        entity = entities.get(task_id) if task_id else None
        if entity and hasattr(entity, "entity_id"):
            task["entity_id"] = entity.entity_id
        else:
            task["entity_id"] = None
    conn.send_result(msg["id"], tasks)


@callback
def websocket_get_task(
    hass: HomeAssistant,
    conn: connection.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Get single task."""
    store = hass.data.get(DOMAIN, {}).get("store")
    if not store:
        conn.send_error(msg["id"], "not_loaded", "Integration not loaded")
        return
    task_id = msg["task_id"]
    result = store.get(task_id)
    conn.send_result(msg["id"], result)


def _parse_last_performed(last_str: str | None) -> str | None:
    """Parse last_performed to ISO string."""
    if not last_str:
        return None
    parsed = dt_util.parse_datetime(last_str)
    if parsed is None:
        return None
    parsed_local = dt_util.as_local(parsed)
    return parsed_local.replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()


@callback
def websocket_add_task(
    hass: HomeAssistant,
    conn: connection.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Add a new task."""
    store = hass.data.get(DOMAIN, {}).get("store")
    if not store:
        conn.send_error(msg["id"], "not_loaded", "Integration not loaded")
        return

    last_str = msg.get("last_performed")
    last_performed = _parse_last_performed(last_str)
    if last_str and last_performed is None:
        conn.send_error(msg["id"], "invalid_date", f"Could not parse date: {last_str}")
        return
    if last_performed is None:
        last_performed = (
            dt_util.now().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        )

    notice_fields = {}
    if "notify_service" in msg:
        notice_fields["notify_service"] = msg.get("notify_service")
    notice_error = validate_notice_updates(notice_fields)
    if notice_error:
        conn.send_error(msg["id"], "invalid_notify", notice_error)
        return

    task_type = msg.get("task_type", "time")
    new_task = UpkeepTask(
        id=f"upkeep_{uuid.uuid4().hex}",
        title=msg["title"],
        description=msg.get("description"),
        task_type=task_type,
        interval_value=msg.get("interval_value", 30),
        interval_type=msg.get("interval_type", "days"),
        last_performed=last_performed,
        tag_id=msg.get("tag_id"),
        icon=msg.get("icon"),
        assigned_user=msg.get("assigned_user"),
        frequency_target=msg.get("frequency_target"),
        current_count=msg.get("current_count", 0),
        watched_entity=msg.get("watched_entity"),
        notify_when_due=msg.get("notify_when_due", False),
        notify_before=msg.get("notify_before", False),
        notify_before_value=msg.get("notify_before_value", 7),
        notify_before_unit=msg.get("notify_before_unit", "days"),
        notify_service=notice_fields.get("notify_service"),
    )

    labels = msg.get("labels", [])
    try:
        new_id = store.add(new_task, labels)
        conn.send_result(msg["id"], {"success": True, "id": new_id})
    except RuntimeError as e:
        conn.send_error(msg["id"], "add_failed", str(e))


@callback
def websocket_update_task(
    hass: HomeAssistant,
    conn: connection.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update a task."""
    store = hass.data.get(DOMAIN, {}).get("store")
    if not store:
        conn.send_error(msg["id"], "not_loaded", "Integration not loaded")
        return
    task_id = msg["task_id"]
    updates = msg.get("updates", {})
    for internal_key in (
        "notified_before_due",
        "notified_due_on",
        "notified_frequency_due",
    ):
        updates.pop(internal_key, None)

    if "last_performed" in updates:
        last_str = updates["last_performed"]
        last_performed = _parse_last_performed(last_str)
        if last_str and last_performed is None:
            conn.send_error(
                msg["id"], "invalid_date", f"Could not parse date: {last_str}"
            )
            return
        updates["last_performed"] = last_performed or (
            dt_util.now().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        )

    notice_error = validate_notice_updates(updates)
    if notice_error:
        conn.send_error(msg["id"], "invalid_notify", notice_error)
        return

    try:
        store.update_task(task_id, updates)
        conn.send_result(msg["id"], {"success": True})
    except RuntimeError as e:
        conn.send_error(msg["id"], "update_failed", str(e))


@callback
def websocket_complete_task(
    hass: HomeAssistant,
    conn: connection.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Mark a task as completed."""
    store = hass.data.get(DOMAIN, {}).get("store")
    if not store:
        conn.send_error(msg["id"], "not_loaded", "Integration not loaded")
        return
    task_id = msg["task_id"]
    try:
        store.update_last_performed(task_id)
        conn.send_result(msg["id"], {"success": True})
    except RuntimeError as e:
        conn.send_error(msg["id"], "complete_failed", str(e))


@callback
def websocket_remove_task(
    hass: HomeAssistant,
    conn: connection.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Remove a task."""
    store = hass.data.get(DOMAIN, {}).get("store")
    if not store:
        conn.send_error(msg["id"], "not_loaded", "Integration not loaded")
        return
    task_id = msg["task_id"]
    try:
        store.delete(task_id)
        conn.send_result(msg["id"], {"success": True})
    except RuntimeError as e:
        conn.send_error(msg["id"], "remove_failed", str(e))


@callback
def websocket_snooze_task(
    hass: HomeAssistant,
    conn: connection.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Snooze or disable a task."""
    store = hass.data.get(DOMAIN, {}).get("store")
    if not store:
        conn.send_error(msg["id"], "not_loaded", "Integration not loaded")
        return
    task_id = msg["task_id"]
    snooze_until = msg.get("snooze_until")
    disable = msg.get("disable", False)
    try:
        store.snooze_task(task_id, snooze_until=snooze_until, disable=disable)
        conn.send_result(msg["id"], {"success": True})
    except RuntimeError as e:
        conn.send_error(msg["id"], "snooze_failed", str(e))


@callback
def websocket_increment_counter(
    hass: HomeAssistant,
    conn: connection.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Increment the counter for a frequency-based task."""
    store = hass.data.get(DOMAIN, {}).get("store")
    if not store:
        conn.send_error(msg["id"], "not_loaded", "Integration not loaded")
        return
    task_id = msg["task_id"]
    try:
        store.increment_counter(task_id)
        conn.send_result(msg["id"], {"success": True})
    except RuntimeError as e:
        conn.send_error(msg["id"], "increment_failed", str(e))


@callback
def websocket_enable_task(
    hass: HomeAssistant,
    conn: connection.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Re-enable a snoozed or disabled task."""
    store = hass.data.get(DOMAIN, {}).get("store")
    if not store:
        conn.send_error(msg["id"], "not_loaded", "Integration not loaded")
        return
    task_id = msg["task_id"]
    try:
        store.enable_task(task_id)
        conn.send_result(msg["id"], {"success": True})
    except RuntimeError as e:
        conn.send_error(msg["id"], "enable_failed", str(e))


@callback
def websocket_get_config(
    hass: HomeAssistant,
    conn: connection.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Retrieve integration configuration."""
    entries = hass.config_entries.async_entries(DOMAIN)
    if not entries:
        conn.send_error(msg["id"], "not_found", "No config entry found")
        return
    entry = entries[0]
    conn.send_result(
        msg["id"],
        {
            "data": dict(entry.data),
            "options": dict(entry.options),
        },
    )


async def async_register_websockets(hass: HomeAssistant) -> None:
    """Register WebSocket commands."""
    websocket_api.async_register_command(
        hass,
        "upkeep/get_tasks",
        websocket_get_tasks,
        messages.BASE_COMMAND_MESSAGE_SCHEMA.extend(
            {vol.Required("type"): "upkeep/get_tasks"}
        ),
    )
    websocket_api.async_register_command(
        hass,
        "upkeep/get_task",
        websocket_get_task,
        messages.BASE_COMMAND_MESSAGE_SCHEMA.extend(
            {
                vol.Required("type"): "upkeep/get_task",
                vol.Required("task_id"): str,
            }
        ),
    )
    websocket_api.async_register_command(
        hass,
        "upkeep/add_task",
        websocket_add_task,
        messages.BASE_COMMAND_MESSAGE_SCHEMA.extend(
            {
                vol.Required("type"): "upkeep/add_task",
                vol.Required("title"): str,
                vol.Optional("description"): str,
                vol.Optional("task_type", default="time"): str,
                vol.Optional("interval_value", default=30): int,
                vol.Optional("interval_type", default="days"): str,
                vol.Optional("last_performed"): str,
                vol.Optional("tag_id"): str,
                vol.Optional("icon"): str,
                vol.Optional("assigned_user"): str,
                vol.Optional("frequency_target"): int,
                vol.Optional("current_count", default=0): int,
                vol.Optional("watched_entity"): str,
                vol.Optional("notify_when_due", default=False): bool,
                vol.Optional("notify_before", default=False): bool,
                vol.Optional("notify_before_value", default=7): vol.All(int, vol.Range(min=1)),
                vol.Optional("notify_before_unit", default="days"): vol.In(sorted(NOTIFY_UNITS)),
                vol.Optional("notify_service"): vol.Any(None, str),
                vol.Optional("labels"): [str],
            }
        ),
    )
    websocket_api.async_register_command(
        hass,
        "upkeep/update_task",
        websocket_update_task,
        messages.BASE_COMMAND_MESSAGE_SCHEMA.extend(
            {
                vol.Required("type"): "upkeep/update_task",
                vol.Required("task_id"): str,
                vol.Required("updates"): dict,
            }
        ),
    )
    websocket_api.async_register_command(
        hass,
        "upkeep/complete_task",
        websocket_complete_task,
        messages.BASE_COMMAND_MESSAGE_SCHEMA.extend(
            {
                vol.Required("type"): "upkeep/complete_task",
                vol.Required("task_id"): str,
            }
        ),
    )
    websocket_api.async_register_command(
        hass,
        "upkeep/remove_task",
        websocket_remove_task,
        messages.BASE_COMMAND_MESSAGE_SCHEMA.extend(
            {
                vol.Required("type"): "upkeep/remove_task",
                vol.Required("task_id"): str,
            }
        ),
    )
    websocket_api.async_register_command(
        hass,
        "upkeep/snooze_task",
        websocket_snooze_task,
        messages.BASE_COMMAND_MESSAGE_SCHEMA.extend(
            {
                vol.Required("type"): "upkeep/snooze_task",
                vol.Required("task_id"): str,
                vol.Optional("snooze_until"): str,
                vol.Optional("disable", default=False): bool,
            }
        ),
    )
    websocket_api.async_register_command(
        hass,
        "upkeep/increment_counter",
        websocket_increment_counter,
        messages.BASE_COMMAND_MESSAGE_SCHEMA.extend(
            {
                vol.Required("type"): "upkeep/increment_counter",
                vol.Required("task_id"): str,
            }
        ),
    )
    websocket_api.async_register_command(
        hass,
        "upkeep/enable_task",
        websocket_enable_task,
        messages.BASE_COMMAND_MESSAGE_SCHEMA.extend(
            {
                vol.Required("type"): "upkeep/enable_task",
                vol.Required("task_id"): str,
            }
        ),
    )
    websocket_api.async_register_command(
        hass,
        "upkeep/get_config",
        websocket_get_config,
        messages.BASE_COMMAND_MESSAGE_SCHEMA.extend(
            {vol.Required("type"): "upkeep/get_config"}
        ),
    )
