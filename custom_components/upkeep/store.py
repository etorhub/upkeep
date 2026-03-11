"""Store Upkeep configuration."""

import logging
from dataclasses import asdict, dataclass
from datetime import datetime

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry, storage
from homeassistant.util import dt as dt_util

from . import const
from .binary_sensor import UpkeepSensor

_LOGGER = logging.getLogger(__name__)

STORAGE_KEY = "upkeep.storage"
STORAGE_VERSION_MAJOR = 1
STORAGE_VERSION_MINOR = 2


@dataclass
class UpkeepTask:
    """Represents a single upkeep task."""

    id: str
    title: str
    description: str | None = None

    # Type: "time" (every N days/weeks/months) or "frequency" (after N usages)
    task_type: str = const.TASK_TYPE_TIME

    # --- Time-based fields ---
    interval_value: int = 30
    interval_type: str = "days"
    last_performed: str | None = None

    # --- Frequency-based fields ---
    frequency_target: int | None = None
    current_count: int = 0
    watched_entity: str | None = None

    # --- Assignment & metadata ---
    assigned_user: str | None = None
    icon: str | None = None
    tag_id: str | None = None

    # --- Snooze ---
    enabled: bool = True
    snoozed_until: str | None = None

    # --- Notifications ---
    notify_when_due: bool = False

    def to_dict(self) -> dict:
        """Convert to dict for storage."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "UpkeepTask":
        """Create from dict."""
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


def _task_from_dict(data: dict) -> UpkeepTask:
    """Load task from dict, handling legacy fields."""
    # Map legacy fields
    if "last_performed" in data and data["last_performed"] == "":
        data = {**data, "last_performed": None}
    if "task_type" not in data:
        data = {**data, "task_type": const.TASK_TYPE_TIME}
    if "interval_value" not in data and "frequency_target" in data:
        data = {**data, "interval_value": data.get("frequency_target", 30)}
    return UpkeepTask.from_dict(data)


class TaskStore:
    """Class to hold upkeep task data."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the storage."""
        self.hass = hass
        self._store = storage.Store(
            hass,
            STORAGE_VERSION_MAJOR,
            STORAGE_KEY,
            minor_version=STORAGE_VERSION_MINOR,
        )
        self._tasks: dict[str, UpkeepTask] = {}

    async def async_load(self) -> None:
        """Load tasks from storage."""
        data = await self._store.async_load()
        if data is None:
            return

        self._tasks = {}
        for task_data in data:
            try:
                task = _task_from_dict(task_data)
                self._tasks[task.id] = task
            except (TypeError, KeyError) as e:
                _LOGGER.warning("Skipping invalid task %s: %s", task_data.get("id"), e)

    def get_all(self) -> list[dict]:
        """Get all tasks."""
        return [t.to_dict() for t in self._tasks.values()]

    def get(self, task_id: str) -> dict | None:
        """Get single task."""
        task = self._tasks.get(task_id)
        return task.to_dict() if task else None

    def _get_tag_uuids(self) -> dict[str, str]:
        """Return a mapping of all task's tag friendly IDs into tag UUIDs."""
        er = entity_registry.async_get(self.hass)
        tag_ids = [t.tag_id for t in self._tasks.values() if t.tag_id]
        tag_uuids = {}
        for tag_id in tag_ids:
            if tag_id in tag_uuids:
                continue
            entry = er.async_get(tag_id)
            if entry:
                tag_uuids[tag_id] = entry.unique_id
        return tag_uuids

    def get_by_tag_uuid(self, tag_uuid: str) -> list[dict]:
        """Get tasks given a tag UUID."""
        tag_uuids = self._get_tag_uuids()
        return [
            t.to_dict()
            for t in self._tasks.values()
            if t.tag_id and tag_uuids.get(t.tag_id) == tag_uuid
        ]

    def get_by_tag_id(self, tag_id: str) -> list[dict]:
        """Get tasks by tag id."""
        return [t.to_dict() for t in self._tasks.values() if t.tag_id == tag_id]

    def add(self, task: UpkeepTask, labels: list[str] | None = None) -> str | None:
        """Add new task."""
        add_entities = self.hass.data[const.DOMAIN].get("add_entities")
        if not add_entities:
            raise RuntimeError("add_entities not registered yet.")
        device_id = self.hass.data[const.DOMAIN].get("device_id")
        if not device_id:
            raise RuntimeError("Device ID not available.")

        entity = UpkeepSensor(
            self.hass, task.to_dict(), device_id, labels=labels
        )
        add_entities([entity])
        self._tasks[task.id] = task
        self.hass.data[const.DOMAIN]["entities"][task.id] = entity
        self._save()
        return task.id

    def delete(self, task_id: str) -> None:
        """Remove a task."""
        er = entity_registry.async_get(self.hass)
        entity_entry = next(
            (
                entry
                for entry in er.entities.values()
                if entry.unique_id == task_id and entry.platform == const.DOMAIN
            ),
            None,
        )
        if entity_entry is None:
            raise RuntimeError(f"No entity found with task ID {task_id}.")

        er.async_remove(entity_entry.entity_id)
        del self._tasks[task_id]
        self._save()

    def update_task(self, task_id: str, updated: dict) -> None:
        """Update an existing task with new values from a dictionary."""
        entity = self.hass.data[const.DOMAIN]["entities"].get(task_id)
        task = self._tasks.get(task_id)

        if entity is None or task is None:
            raise RuntimeError("Task not found.")

        for key, value in updated.items():
            if hasattr(task, key):
                setattr(task, key, value)
            entity.task[key] = value

        if "labels" in updated:
            registry = entity_registry.async_get(self.hass)
            if registry.async_get(entity.entity_id):
                registry.async_update_entity(
                    entity.entity_id, labels=set(updated["labels"])
                )

        entity.async_schedule_update_ha_state(force_refresh=True)
        self._save()

    def complete_task(
        self, task_id: str, performed_date: datetime | None = None
    ) -> None:
        """Complete a task: reset last_performed (time) or counter (frequency)."""
        entity = self.hass.data[const.DOMAIN]["entities"].get(task_id)
        task = self._tasks.get(task_id)

        if entity is None or task is None:
            raise RuntimeError("Task not found.")

        if task.task_type == const.TASK_TYPE_FREQUENCY:
            task.current_count = 0
            entity.task["current_count"] = 0
        else:
            if performed_date is None:
                performed_date = dt_util.now()
            performed_date_str = performed_date.replace(
                hour=0, minute=0, second=0, microsecond=0
            ).isoformat()
            entity.task["last_performed"] = performed_date_str
            task.last_performed = performed_date_str

        entity.async_schedule_update_ha_state(force_refresh=True)
        self._save()

    def update_last_performed(
        self, task_id: str, performed_date: datetime | None = None
    ) -> None:
        """Update a task's last performed date (time-based tasks only)."""
        self.complete_task(task_id, performed_date)

    def increment_counter(self, task_id: str) -> None:
        """Increment the usage counter for a frequency-based task."""
        entity = self.hass.data[const.DOMAIN]["entities"].get(task_id)
        task = self._tasks.get(task_id)

        if entity is None or task is None:
            raise RuntimeError("Task not found.")
        if task.task_type != const.TASK_TYPE_FREQUENCY:
            raise RuntimeError("Task is not a frequency-based task.")

        task.current_count += 1
        entity.task["current_count"] = task.current_count
        entity.async_schedule_update_ha_state(force_refresh=True)
        self._save()

    def snooze_task(
        self, task_id: str, snooze_until: str | None = None, disable: bool = False
    ) -> None:
        """Snooze or disable a task."""
        entity = self.hass.data[const.DOMAIN]["entities"].get(task_id)
        task = self._tasks.get(task_id)

        if entity is None or task is None:
            raise RuntimeError("Task not found.")

        if disable:
            task.enabled = False
            task.snoozed_until = None
            entity.task["enabled"] = False
            entity.task["snoozed_until"] = None
        else:
            task.enabled = False
            task.snoozed_until = snooze_until
            entity.task["enabled"] = False
            entity.task["snoozed_until"] = snooze_until

        entity.async_schedule_update_ha_state(force_refresh=True)
        self._save()

    def enable_task(self, task_id: str) -> None:
        """Re-enable a snoozed or disabled task."""
        entity = self.hass.data[const.DOMAIN]["entities"].get(task_id)
        task = self._tasks.get(task_id)

        if entity is None or task is None:
            raise RuntimeError("Task not found.")

        task.enabled = True
        task.snoozed_until = None
        entity.task["enabled"] = True
        entity.task["snoozed_until"] = None
        entity.async_schedule_update_ha_state(force_refresh=True)
        self._save()

    def _save(self) -> None:
        """Save tasks in the background."""
        self.hass.async_create_task(
            self._store.async_save([t.to_dict() for t in self._tasks.values()])
        )
