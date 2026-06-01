"""Support for Upkeep binary sensors."""

import logging
from datetime import datetime, timedelta

from dateutil.relativedelta import relativedelta
from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from . import const

_LOGGER = logging.getLogger(__name__)


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

    def _calculate_next_due(
        self, last_performed: datetime, interval_value: int, interval_type: str
    ) -> datetime:
        """Calculate the next date based on last date and interval."""
        if interval_type == "days":
            return last_performed + timedelta(days=interval_value)
        if interval_type == "weeks":
            return last_performed + timedelta(weeks=interval_value)
        if interval_type == "months":
            return last_performed + relativedelta(months=interval_value)
        return last_performed

    def _compute_progress_and_urgency(
        self, last_performed: datetime, next_due: datetime
    ) -> tuple[float, int, str]:
        """Compute progress %, days_remaining, and urgency."""
        now = dt_util.now().replace(hour=0, minute=0, second=0, microsecond=0)
        last = last_performed.replace(hour=0, minute=0, second=0, microsecond=0)
        due = next_due.replace(hour=0, minute=0, second=0, microsecond=0)

        total_ms = (due - last).total_seconds() * 1000
        elapsed_ms = (now - last).total_seconds() * 1000
        progress = (elapsed_ms / total_ms * 100) if total_ms > 0 else 100
        progress = min(100, max(0, round(progress, 1)))

        diff_ms = (due - now).total_seconds() * 1000
        days_remaining = int(diff_ms / (1000 * 60 * 60 * 24))

        if progress >= 100:
            urgency = "overdue"
        elif days_remaining <= 7:
            urgency = "due_soon"
        else:
            urgency = "on_track"

        return progress, days_remaining, urgency

    def _update_state(self) -> None:
        """Get the latest state of the sensor."""
        task_type = self.task.get("task_type", const.TASK_TYPE_TIME)
        enabled = self.task.get("enabled", True)
        snoozed_until = self.task.get("snoozed_until")

        # Check snooze
        if not enabled:
            self._attr_is_on = False
            self._attr_extra_state_attributes = self._base_attrs()
            self._attr_extra_state_attributes["enabled"] = False
            self._attr_extra_state_attributes["snoozed_until"] = snoozed_until
            self._attr_extra_state_attributes["urgency"] = "snoozed"
            self._attr_extra_state_attributes["progress"] = 0
            self._attr_extra_state_attributes["days_remaining"] = 0
            return

        if task_type == const.TASK_TYPE_FREQUENCY:
            self._update_state_frequency()
            return

        # Time-based
        last_str = self.task.get("last_performed")
        if not last_str:
            self._attr_is_on = True
            self._attr_extra_state_attributes = self._base_attrs()
            self._attr_extra_state_attributes["last_performed"] = ""
            self._attr_extra_state_attributes["next_due"] = "unknown"
            self._attr_extra_state_attributes["progress"] = 100
            self._attr_extra_state_attributes["days_remaining"] = 0
            self._attr_extra_state_attributes["urgency"] = "overdue"
            return

        last = dt_util.parse_datetime(last_str)
        if last is None:
            self._attr_is_on = True
            self._attr_extra_state_attributes = self._base_attrs()
            self._attr_extra_state_attributes["next_due"] = "unknown"
            self._attr_extra_state_attributes["urgency"] = "overdue"
            return

        if last.tzinfo is None:
            last = dt_util.as_utc(last)

        interval_value = self.task.get("interval_value", 30)
        interval_type = self.task.get("interval_type", "days")
        due_date = self._calculate_next_due(last, interval_value, interval_type)
        due_date = due_date.replace(hour=0, minute=0, second=0, microsecond=0)

        now = dt_util.now().replace(hour=0, minute=0, second=0, microsecond=0)
        self._attr_is_on = now >= due_date

        progress, days_remaining, urgency = self._compute_progress_and_urgency(
            last, due_date
        )

        self._attr_extra_state_attributes = {
            **self._base_attrs(),
            "last_performed": self.task["last_performed"],
            "next_due": due_date.isoformat(),
            "progress": progress,
            "days_remaining": days_remaining,
            "urgency": urgency,
        }

    def _update_state_frequency(self) -> None:
        """Update state for frequency-based tasks."""
        target = self.task.get("frequency_target") or 1
        current = self.task.get("current_count", 0)
        progress = min(100, round((current / target) * 100, 1))
        uses_remaining = max(0, target - current)

        self._attr_is_on = current >= target
        urgency = "overdue" if self._attr_is_on else (
            "due_soon" if uses_remaining <= 1 else "on_track"
        )

        self._attr_extra_state_attributes = {
            **self._base_attrs(),
            "task_type": const.TASK_TYPE_FREQUENCY,
            "frequency_target": target,
            "current_count": current,
            "progress": progress,
            "days_remaining": 0,
            "urgency": urgency,
            "next_due": f"After {uses_remaining} more uses" if uses_remaining > 0 else "Due",
            "last_performed": "",
        }

    def _base_attrs(self) -> dict:
        """Base attributes for all task types."""
        attrs = {
            "icon": self.task.get("icon") or "mdi:calendar-check",
            "interval_value": self.task.get("interval_value"),
            "interval_type": self.task.get("interval_type"),
            "task_type": self.task.get("task_type", const.TASK_TYPE_TIME),
            "description": self.task.get("description"),
            "assigned_user": self.task.get("assigned_user"),
            "enabled": self.task.get("enabled", True),
            "snoozed_until": self.task.get("snoozed_until"),
            "frequency_target": self.task.get("frequency_target"),
            "current_count": self.task.get("current_count", 0),
            "watched_entity": self.task.get("watched_entity"),
        }
        if self.task.get("tag_id"):
            attrs["tag_id"] = self.task["tag_id"]
        return attrs

    async def async_update(self) -> None:
        """Get the latest state of the sensor."""
        self._update_state()

    async def async_added_to_hass(self) -> None:
        """Run when entity is added to Home Assistant."""
        if self._labels:
            registry = er.async_get(self.hass)
            if registry.async_get(self.entity_id):
                registry.async_update_entity(
                    self.entity_id, labels=set(self._labels)
                )
