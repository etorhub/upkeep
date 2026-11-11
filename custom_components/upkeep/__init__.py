"""Support for Upkeep platform."""

import logging
from datetime import datetime

from homeassistant.components.binary_sensor import DOMAIN as BINARY_SENSOR_DOMAIN
from homeassistant.components.tag.const import EVENT_TAG_SCANNED
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import (
    CoreState,
    Event,
    HomeAssistant,
    ServiceCall,
    ServiceResponse,
    SupportsResponse,
    callback,
)
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.typing import ConfigType
from homeassistant.util import dt as dt_util

from . import const
from .mutations import new_task_from_data, prepare_updates
from .coordinator import UpkeepCoordinator
from .entity_watch import setup_entity_watch
from .frontend import async_register_card
from .panel import async_register_panel, async_unregister_panel
from .store import TaskStore
from .websocket import async_register_websockets

_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = const.CONFIG_SCHEMA


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Track states and offer events for sensors."""

    async def _register_card(_=None):
        await async_register_card(hass)

    if hass.state == CoreState.running:
        await _register_card()
    else:
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _register_card)

    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up the Upkeep config entry."""

    @callback
    def handle_tag_scanned_event(event: Event) -> None:
        """Handle when a tag is scanned."""
        tag_id = event.data.get("tag_id")
        if not tag_id:
            return
        store = hass.data.get(const.DOMAIN, {}).get("store")
        if not store:
            return
        tasks = store.get_by_tag_uuid(tag_id)
        if not tasks:
            tasks = store.get_by_tag_id(tag_id)
        if not tasks:
            return
        _LOGGER.debug("Tag scanned: %s", tag_id)
        for task in tasks:
            store.update_last_performed(task["id"])

    task_store = TaskStore(hass)
    await task_store.async_load()

    device_registry = dr.async_get(hass)
    device = device_registry.async_get_or_create(
        config_entry_id=entry.entry_id,
        identifiers={(const.DOMAIN, const.DEVICE_KEY)},
        name=const.NAME,
        model=const.NAME,
        sw_version=const.VERSION,
        manufacturer=const.MANUFACTURER,
    )

    hass.data.setdefault(const.DOMAIN, {})
    hass.data[const.DOMAIN] = {
        "add_entities": None,
        "entry_id": entry.entry_id,
        "device_id": device.id,
        "store": task_store,
        "entities": {},
    }

    coordinator = UpkeepCoordinator(hass)
    await coordinator.async_config_entry_first_refresh()
    hass.data[const.DOMAIN]["coordinator"] = coordinator

    await hass.config_entries.async_forward_entry_setups(
        entry, [BINARY_SENSOR_DOMAIN]
    )

    await async_register_panel(hass, entry)
    await async_register_websockets(hass)
    _register_services(hass)

    unsub = hass.bus.async_listen(EVENT_TAG_SCANNED, handle_tag_scanned_event)
    hass.data[const.DOMAIN]["unsub_tag_scanned"] = unsub

    unsub_watch = setup_entity_watch(hass)
    hass.data[const.DOMAIN]["unsub_entity_watch"] = unsub_watch

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload Upkeep config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(
        entry, [BINARY_SENSOR_DOMAIN]
    )
    if not unload_ok:
        return False

    if "unsub_tag_scanned" in hass.data.get(const.DOMAIN, {}):
        hass.data[const.DOMAIN]["unsub_tag_scanned"]()

    if "unsub_entity_watch" in hass.data.get(const.DOMAIN, {}):
        hass.data[const.DOMAIN]["unsub_entity_watch"]()

    async_unregister_panel(hass)
    hass.data.pop(const.DOMAIN, None)
    return True


async def async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle reload of a config entry."""
    await async_unload_entry(hass, entry)
    await async_setup_entry(hass, entry)


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Remove Upkeep config entry."""
    async_unregister_panel(hass)
    hass.data.pop(const.DOMAIN, None)


async def async_migrate_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Handle migration of config entry."""
    return True


def _validation_error(err: Exception) -> ServiceValidationError:
    """Turn a task error into a service validation error."""
    return ServiceValidationError(str(err))


def _store_from_call(hass: HomeAssistant):
    """Return the loaded task store, or raise when the integration is missing."""
    store = hass.data.get(const.DOMAIN, {}).get("store")
    if not store:
        raise ServiceValidationError("Upkeep is not loaded")
    return store


def _task_id_from_call(store, call: ServiceCall) -> str:
    """Resolve a service target, raising when the task does not exist."""
    try:
        return store.resolve_task_id(
            entity_id=call.data.get("entity_id"),
            task_id=call.data.get("task_id"),
        )
    except RuntimeError as err:
        raise _validation_error(err) from err


def _service_response(result: dict) -> ServiceResponse:
    """Return a service response that includes success."""
    return {"success": True, **result}


@callback
def _register_services(hass: HomeAssistant) -> None:
    """Register services used by upkeep component."""

    async def async_srv_add(call: ServiceCall) -> ServiceResponse:
        """Create a task."""
        store = _store_from_call(hass)
        try:
            task, labels = new_task_from_data(dict(call.data))
            created = await store.async_add(task, labels)
        except (RuntimeError, ValueError) as err:
            raise _validation_error(err) from err
        return _service_response(created)

    async def async_srv_update(call: ServiceCall) -> ServiceResponse:
        """Update a task."""
        store = _store_from_call(hass)
        task_id = _task_id_from_call(store, call)
        updates = {
            key: value
            for key, value in call.data.items()
            if key not in ("entity_id", "task_id")
        }
        try:
            prepared = prepare_updates(updates)
            updated = store.update_task(task_id, prepared)
        except (RuntimeError, ValueError) as err:
            raise _validation_error(err) from err
        return _service_response(updated)

    async def async_srv_remove(call: ServiceCall) -> ServiceResponse:
        """Delete a task."""
        store = _store_from_call(hass)
        task_id = _task_id_from_call(store, call)
        try:
            removed = store.delete(task_id)
        except RuntimeError as err:
            raise _validation_error(err) from err
        return _service_response(removed)

    async def async_srv_reset(call: ServiceCall) -> ServiceResponse:
        """Handle reset_last_performed / complete_task service."""
        store = _store_from_call(hass)
        task_id = _task_id_from_call(store, call)
        performed_date_str = call.data.get("performed_date")

        performed_date = None
        if performed_date_str is not None:
            parsed_date = dt_util.parse_date(performed_date_str)
            if parsed_date is None:
                raise ServiceValidationError(
                    f"Could not parse performed_date: {performed_date_str}"
                )
            combined_date = datetime.combine(parsed_date, datetime.min.time())
            performed_date = dt_util.as_local(combined_date)

        try:
            store.update_last_performed(task_id, performed_date)
        except RuntimeError as err:
            raise _validation_error(err) from err
        return _service_response(store.mutation_result(task_id))

    async def async_srv_snooze(call: ServiceCall) -> ServiceResponse:
        """Handle snooze_task service."""
        store = _store_from_call(hass)
        task_id = _task_id_from_call(store, call)
        try:
            store.snooze_task(
                task_id,
                snooze_until=call.data.get("snooze_until"),
                disable=call.data.get("disable", False),
            )
        except RuntimeError as err:
            raise _validation_error(err) from err
        return _service_response(store.mutation_result(task_id))

    async def async_srv_enable(call: ServiceCall) -> ServiceResponse:
        """Handle enable_task service."""
        store = _store_from_call(hass)
        task_id = _task_id_from_call(store, call)
        try:
            store.enable_task(task_id)
        except RuntimeError as err:
            raise _validation_error(err) from err
        return _service_response(store.mutation_result(task_id))

    async def async_srv_increment(call: ServiceCall) -> ServiceResponse:
        """Handle increment_counter service."""
        store = _store_from_call(hass)
        task_id = _task_id_from_call(store, call)
        try:
            store.increment_counter(task_id)
        except RuntimeError as err:
            raise _validation_error(err) from err
        return _service_response(store.mutation_result(task_id))

    response = SupportsResponse.OPTIONAL
    hass.services.async_register(
        const.DOMAIN,
        const.SERVICE_ADD_TASK,
        async_srv_add,
        schema=const.SERVICE_ADD_TASK_SCHEMA,
        supports_response=response,
    )
    hass.services.async_register(
        const.DOMAIN,
        const.SERVICE_UPDATE_TASK,
        async_srv_update,
        schema=const.SERVICE_UPDATE_TASK_SCHEMA,
        supports_response=response,
    )
    hass.services.async_register(
        const.DOMAIN,
        const.SERVICE_REMOVE_TASK,
        async_srv_remove,
        schema=const.SERVICE_REMOVE_TASK_SCHEMA,
        supports_response=response,
    )
    hass.services.async_register(
        const.DOMAIN,
        const.SERVICE_RESET_LAST_PERFORMED,
        async_srv_reset,
        schema=const.SERVICE_COMPLETE_TASK_SCHEMA,
        supports_response=response,
    )
    hass.services.async_register(
        const.DOMAIN,
        const.SERVICE_COMPLETE_TASK,
        async_srv_reset,
        schema=const.SERVICE_COMPLETE_TASK_SCHEMA,
        supports_response=response,
    )
    hass.services.async_register(
        const.DOMAIN,
        const.SERVICE_SNOOZE_TASK,
        async_srv_snooze,
        schema=const.SERVICE_SNOOZE_TASK_SCHEMA,
        supports_response=response,
    )
    hass.services.async_register(
        const.DOMAIN,
        const.SERVICE_ENABLE_TASK,
        async_srv_enable,
        schema=const.SERVICE_ENABLE_TASK_SCHEMA,
        supports_response=response,
    )
    hass.services.async_register(
        const.DOMAIN,
        const.SERVICE_INCREMENT_COUNTER,
        async_srv_increment,
        schema=const.SERVICE_INCREMENT_COUNTER_SCHEMA,
        supports_response=response,
    )
