"""WebSocket commands for the Upkeep integration."""

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.components.websocket_api import connection, messages
from homeassistant.core import HomeAssistant, callback

from homeassistant.util import dt as dt_util

from .const import DOMAIN
from .meters import evaluate, fresh_state, result_to_dict, validate_trigger
from .mutations import new_task_from_data, prepare_updates
from .notices import NOTIFY_UNITS


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
    if result is None:
        conn.send_error(msg["id"], "not_found", f"No Upkeep task found for {task_id}")
        return
    result["entity_id"] = store.entity_id_for(task_id)
    conn.send_result(msg["id"], result)


def _store_or_error(
    hass: HomeAssistant,
    conn: connection.ActiveConnection,
    msg: dict[str, Any],
):
    """Return the task store, or send not_loaded and return None."""
    store = hass.data.get(DOMAIN, {}).get("store")
    if not store:
        conn.send_error(msg["id"], "not_loaded", "Integration not loaded")
        return None
    return store


def _resolve_or_error(
    store: Any,
    conn: connection.ActiveConnection,
    msg: dict[str, Any],
) -> str | None:
    """Resolve entity_id or task_id, or send an error and return None."""
    try:
        return store.resolve_task_id(
            entity_id=msg.get("entity_id"),
            task_id=msg.get("task_id"),
        )
    except RuntimeError as err:
        conn.send_error(msg["id"], "not_found", str(err))
        return None


@websocket_api.async_response
async def websocket_add_task(
    hass: HomeAssistant,
    conn: connection.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Add a new task."""
    store = _store_or_error(hass, conn, msg)
    if not store:
        return

    payload = {key: value for key, value in msg.items() if key not in {"id", "type"}}
    try:
        new_task, labels = new_task_from_data(payload)
        created = await store.async_add(new_task, labels)
    except ValueError as err:
        conn.send_error(msg["id"], "invalid_task", str(err))
        return
    except RuntimeError as err:
        conn.send_error(msg["id"], "add_failed", str(err))
        return
    conn.send_result(msg["id"], {"success": True, "id": created["task_id"], **created})


@callback
def websocket_update_task(
    hass: HomeAssistant,
    conn: connection.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update a task."""
    store = _store_or_error(hass, conn, msg)
    if not store:
        return
    task_id = _resolve_or_error(store, conn, msg)
    if not task_id:
        return
    try:
        updates = prepare_updates(dict(msg.get("updates") or {}))
        updated = store.update_task(task_id, updates)
    except ValueError as err:
        conn.send_error(msg["id"], "invalid_task", str(err))
        return
    except RuntimeError as err:
        conn.send_error(msg["id"], "update_failed", str(err))
        return
    conn.send_result(msg["id"], {"success": True, **updated})


@callback
def websocket_complete_task(
    hass: HomeAssistant,
    conn: connection.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Mark a task as completed."""
    store = _store_or_error(hass, conn, msg)
    if not store:
        return
    task_id = _resolve_or_error(store, conn, msg)
    if not task_id:
        return
    try:
        performed = None
        if msg.get("performed_date"):
            performed = dt_util.parse_datetime(str(msg["performed_date"]))
            if performed is None:
                raise ValueError(f"Could not parse date: {msg['performed_date']}")
        store.update_last_performed(task_id, performed)
    except (RuntimeError, ValueError) as err:
        conn.send_error(msg["id"], "complete_failed", str(err))
        return
    conn.send_result(msg["id"], {"success": True, **store.mutation_result(task_id)})


@callback
def websocket_preview_task(
    hass: HomeAssistant,
    conn: connection.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Run the meter engine for an unsaved draft."""
    trigger = msg.get("trigger")
    errors = validate_trigger(trigger or {})
    if errors:
        conn.send_error(msg["id"], "invalid_task", errors[0])
        return
    draft = {
        "title": msg.get("title") or "",
        "enabled": True,
        "trigger": trigger,
        "state": msg.get("state") or fresh_state(trigger),
        "task_type": msg.get("task_type"),
    }
    zone = hass.config.time_zone or "UTC"
    result = evaluate(draft, dt_util.now(), zone, 7)
    conn.send_result(msg["id"], result_to_dict(result))


@callback
def websocket_remove_task(
    hass: HomeAssistant,
    conn: connection.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Remove a task."""
    store = _store_or_error(hass, conn, msg)
    if not store:
        return
    task_id = _resolve_or_error(store, conn, msg)
    if not task_id:
        return
    try:
        removed = store.delete(task_id)
    except RuntimeError as err:
        conn.send_error(msg["id"], "remove_failed", str(err))
        return
    conn.send_result(msg["id"], {"success": True, **removed})


@callback
def websocket_snooze_task(
    hass: HomeAssistant,
    conn: connection.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Snooze or disable a task."""
    store = _store_or_error(hass, conn, msg)
    if not store:
        return
    task_id = _resolve_or_error(store, conn, msg)
    if not task_id:
        return
    snooze_until = msg.get("snooze_until")
    disable = msg.get("disable", False)
    try:
        store.snooze_task(task_id, snooze_until=snooze_until, disable=disable)
    except RuntimeError as err:
        conn.send_error(msg["id"], "snooze_failed", str(err))
        return
    conn.send_result(msg["id"], {"success": True, **store.mutation_result(task_id)})


@callback
def websocket_increment_counter(
    hass: HomeAssistant,
    conn: connection.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Increment the counter for a frequency-based task."""
    store = _store_or_error(hass, conn, msg)
    if not store:
        return
    task_id = _resolve_or_error(store, conn, msg)
    if not task_id:
        return
    try:
        store.increment_counter(task_id)
    except RuntimeError as err:
        conn.send_error(msg["id"], "increment_failed", str(err))
        return
    conn.send_result(msg["id"], {"success": True, **store.mutation_result(task_id)})


@callback
def websocket_enable_task(
    hass: HomeAssistant,
    conn: connection.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Re-enable a snoozed or disabled task."""
    store = _store_or_error(hass, conn, msg)
    if not store:
        return
    task_id = _resolve_or_error(store, conn, msg)
    if not task_id:
        return
    try:
        store.enable_task(task_id)
    except RuntimeError as err:
        conn.send_error(msg["id"], "enable_failed", str(err))
        return
    conn.send_result(msg["id"], {"success": True, **store.mutation_result(task_id)})


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
                vol.Optional("trigger"): dict,
                vol.Optional("state"): dict,
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
                vol.Optional("task_id"): str,
                vol.Optional("entity_id"): str,
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
                vol.Optional("task_id"): str,
                vol.Optional("entity_id"): str,
                vol.Optional("performed_date"): str,
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
                vol.Optional("task_id"): str,
                vol.Optional("entity_id"): str,
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
                vol.Optional("task_id"): str,
                vol.Optional("entity_id"): str,
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
                vol.Optional("task_id"): str,
                vol.Optional("entity_id"): str,
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
                vol.Optional("task_id"): str,
                vol.Optional("entity_id"): str,
            }
        ),
    )
    websocket_api.async_register_command(
        hass,
        "upkeep/preview_task",
        websocket_preview_task,
        messages.BASE_COMMAND_MESSAGE_SCHEMA.extend(
            {
                vol.Required("type"): "upkeep/preview_task",
                vol.Required("trigger"): dict,
                vol.Optional("state"): dict,
                vol.Optional("title"): str,
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
