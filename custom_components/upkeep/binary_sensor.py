"""Support for Upkeep binary sensors."""

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from . import const
from .meters import entity_attributes, evaluate


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the Upkeep binary sensor platform."""
    if const.DOMAIN not in hass.data:
        hass.data[const.DOMAIN] = {}
    hass.data[const.DOMAIN]["add_entities"] = async_add_entities

    device_id = hass.data[const.DOMAIN].get("device_id")
    store = hass.data[const.DOMAIN].get("store")

    if not device_id or not store:
        return

    entities = []
    for task in store.get_all():
        entity = UpkeepSensor(hass, task, device_id)
        entities.append(entity)
        hass.data[const.DOMAIN].setdefault("entities", {})[task["id"]] = entity

    async_add_entities(entities)


class UpkeepSensor(BinarySensorEntity):
    """Representation of an Upkeep binary sensor."""

    def __init__(
        self,
        hass: HomeAssistant,
        task: dict,
        device_id: str,
        labels: list[str] | None = None,
    ) -> None:
        """Initialize the Upkeep sensor."""
        self.hass = hass
        self.task = task
        self._attr_name = task["title"]
        self._attr_unique_id = task["id"]
        self._device_id = device_id
        self._labels = labels or []
        self._update_state()

    @property
    def device_info(self) -> DeviceInfo | None:
        """Return device information for this sensor."""
        return DeviceInfo(
            identifiers={(const.DOMAIN, const.DEVICE_KEY)},
            name=const.NAME,
            model=const.NAME,
            sw_version=const.VERSION,
            manufacturer=const.MANUFACTURER,
        )

    @property
    def icon(self) -> str | None:
        """Return the icon for the task."""
        return self.task.get("icon") or "mdi:calendar-check"

    def _update_state(self) -> None:
        """Publish the meter engine result on this entity."""
        zone = getattr(self.hass.config, "time_zone", None) or "UTC"
        result = evaluate(self.task, dt_util.now(), zone, 7)
        self._attr_is_on = result.is_due
        self._attr_extra_state_attributes = entity_attributes(self.task, result)

    async def async_update(self) -> None:
        """Get the latest state of the sensor."""
        self._update_state()

    async def async_added_to_hass(self) -> None:
        """Run when entity is added to Home Assistant."""
        if self._labels:
            registry = er.async_get(self.hass)
            if registry.async_get(self.entity_id):
                registry.async_update_entity(self.entity_id, labels=set(self._labels))
