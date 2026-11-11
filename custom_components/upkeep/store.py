"""Store Upkeep configuration."""

import inspect
import logging
from dataclasses import asdict, dataclass, field
from datetime import datetime

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry, storage
from homeassistant.util import dt as dt_util

from . import const
from .binary_sensor import UpkeepSensor
from .meters import (
    apply_done,
    apply_observation,
    evaluate,
    fresh_state,
    migrate_storage,
    migrate_task,
    public_task_type,
    runtime_binding,
    validate_trigger,
)
from .notices import notice_catalog, persistent_notification_ids

_LOGGER = logging.getLogger(__name__)

STORAGE_KEY = "upkeep.storage"
STORAGE_VERSION_MAJOR = 1
STORAGE_VERSION_MINOR = 3
_LEGACY_UPDATE_FIELDS = (
    "interval_value",
    "interval_type",
    "last_performed",
    "frequency_target",
    "current_count",
    "watched_entity",
)


class _UpkeepStorage(storage.Store):
    """Store that migrates the task list to 1.3."""

    async def _async_migrate_func(self, old_major_version, old_minor_version, old_data):
        """Migrate older task lists. Home Assistant will not downgrade this file."""
        if old_major_version != STORAGE_VERSION_MAJOR or old_minor_version > STORAGE_VERSION_MINOR:
            raise NotImplementedError
        return migrate_storage(old_data)


@dataclass
class UpkeepTask:
    """Represents a single upkeep task."""

    id: str
    title: str
    description: str | None = None
    task_type: str = const.TASK_TYPE_TIME
    trigger: dict = field(default_factory=dict)
    state: dict = field(default_factory=dict)
    assigned_user: str | None = None
    icon: str | None = None
    tag_id: str | None = None
    enabled: bool = True
    snoozed_until: str | None = None
    snooze_progress: float | None = None
    snooze_meters: list | None = None
    notify_when_due: bool = False
    notify_before: bool = False
    notify_before_value: int = 7
    notify_before_unit: str = "days"
    notify_service: str | None = None
    notified_cycle_key: str | None = None
    notified_kinds: list = field(default_factory=list)

    def to_dict(self) -> dict:
        """Convert to dict for storage."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "UpkeepTask":
        """Create from dict."""
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


def _task_from_dict(data: dict) -> UpkeepTask:
    """Load one task, migrating a legacy flat record when needed."""
    migrated = migrate_task(data)
    if migrated.get("notified_kinds") is None:
        migrated["notified_kinds"] = []
    return UpkeepTask.from_dict(migrated)


class TaskStore:
    """Class to hold upkeep task data."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the storage."""
        self.hass = hass
        self._store = _UpkeepStorage(
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

    def entity_id_for(self, task_id: str) -> str | None:
        """Return the entity id for a task, once Home Assistant has assigned one."""
        entities = self.hass.data.get(const.DOMAIN, {}).get("entities", {})
        entity = entities.get(task_id)
        entity_id = getattr(entity, "entity_id", None) if entity is not None else None
        if entity_id:
            return entity_id
        registry = entity_registry.async_get(self.hass)
        for entry in registry.entities.values():
            if entry.unique_id == task_id and entry.platform == const.DOMAIN:
                return entry.entity_id
        return None

    def mutation_result(self, task_id: str) -> dict:
        """Return the ids and stored task after a create or update."""
        task = self.get(task_id)
        entity_id = self.entity_id_for(task_id)
        if task is not None:
            task = {**task, "entity_id": entity_id}
        return {"task_id": task_id, "entity_id": entity_id, "task": task}

    def resolve_task_id(
        self, *, entity_id: str | None = None, task_id: str | None = None
    ) -> str:
        """Resolve a service or websocket target to a stored task id."""
        if not entity_id and not task_id:
            raise RuntimeError("entity_id or task_id is required")

        resolved_from_entity = None
        if entity_id:
            registry = entity_registry.async_get(self.hass)
            entry = registry.async_get(entity_id)
            if (
                entry is None
                or entry.platform != const.DOMAIN
                or entry.unique_id not in self._tasks
            ):
                raise RuntimeError(f"No Upkeep task found for {entity_id}")
            resolved_from_entity = entry.unique_id

        if task_id:
            if task_id not in self._tasks:
                raise RuntimeError(f"No Upkeep task found for {task_id}")
            if resolved_from_entity and resolved_from_entity != task_id:
                raise RuntimeError("entity_id and task_id refer to different tasks")
            return task_id
        if resolved_from_entity is None:
            raise RuntimeError("entity_id or task_id is required")
        return resolved_from_entity

    async def async_add(
        self, task: UpkeepTask, labels: list[str] | None = None
    ) -> dict:
        """Add a new task and return its ids once the entity exists."""
        add_entities = self.hass.data[const.DOMAIN].get("add_entities")
        if not add_entities:
            raise RuntimeError("add_entities not registered yet.")
        device_id = self.hass.data[const.DOMAIN].get("device_id")
        if not device_id:
            raise RuntimeError("Device ID not available.")

        if self._dependency_cycle(task.id, task.trigger):
            raise RuntimeError("trigger.errors.cycle")
        entity = UpkeepSensor(self.hass, task.to_dict(), device_id, labels=labels)
        added = add_entities([entity])
        if inspect.isawaitable(added):
            await added
        self._tasks[task.id] = task
        self.hass.data[const.DOMAIN]["entities"][task.id] = entity
        if not getattr(entity, "entity_id", None):
            await self.hass.async_block_till_done()
        self._save()
        self._sync_listeners(task.id)
        return self.mutation_result(task.id)

    def delete(self, task_id: str) -> dict:
        """Remove a task."""
        entity_id = self.entity_id_for(task_id)
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

        self._dismiss_notifications(task_id)
        for other in list(self._tasks.values()):
            if other.id == task_id:
                continue
            if _after_target(other.trigger) == task_id:
                observed = apply_observation(
                    other.to_dict(),
                    {"kind": "source_missing", "source_task_id": task_id},
                    self._zone(),
                )
                other.state = observed["state"]
                self._mirror(other)
        er.async_remove(entity_entry.entity_id)
        del self._tasks[task_id]
        self.hass.data[const.DOMAIN]["entities"].pop(task_id, None)
        self._save()
        self._sync_listeners()
        return {"task_id": task_id, "entity_id": entity_id or entity_entry.entity_id}

    def update_task(self, task_id: str, updated: dict) -> dict:
        """Update an existing task with new values from a dictionary."""
        entity = self.hass.data[const.DOMAIN]["entities"].get(task_id)
        task = self._tasks.get(task_id)

        if entity is None or task is None:
            raise RuntimeError("Task not found.")

        updated = _merge_legacy_updates(task, dict(updated))
        if "trigger" in updated:
            errors = validate_trigger(updated["trigger"])
            if errors:
                raise RuntimeError(errors[0])
            if self._dependency_cycle(task_id, updated["trigger"]):
                raise RuntimeError("trigger.errors.cycle")
            if (
                runtime_binding(task.trigger) != runtime_binding(updated["trigger"])
                and "state" not in updated
            ):
                updated["state"] = fresh_state(updated["trigger"])
            updated["task_type"] = public_task_type(
                updated["trigger"].get("type", ""), task.task_type
            )

        allowed = set(task.__dataclass_fields__) - {"id"}
        allowed.add("labels")
        unknown = sorted(set(updated) - allowed)
        if unknown:
            raise RuntimeError(f"Unknown task fields: {', '.join(unknown)}")

        for key, value in updated.items():
            if key == "labels":
                continue
            setattr(task, key, value)

        if "labels" in updated:
            registry = entity_registry.async_get(self.hass)
            if registry.async_get(entity.entity_id):
                registry.async_update_entity(
                    entity.entity_id, labels=set(updated["labels"])
                )

        if "title" in updated:
            registry = entity_registry.async_get(self.hass)
            if registry.async_get(entity.entity_id):
                registry.async_update_entity(entity.entity_id, name=task.title)

        self._mirror(task)
        self._save()
        if "trigger" in updated:
            self._sync_listeners(task_id)
        return self.mutation_result(task_id)

    def complete_task(
        self, task_id: str, performed_date: datetime | None = None
    ) -> None:
        """Reset this task's meter. The meaning of reset depends on its trigger."""
        task = self._tasks.get(task_id)
        if task is None or task_id not in self.hass.data[const.DOMAIN]["entities"]:
            raise RuntimeError("Task not found.")

        self._dismiss_notifications(task_id)
        when = dt_util.now()
        if performed_date is not None and _uses_performed_date(task.trigger):
            when = performed_date
        done = apply_done(task.to_dict(), when, self._zone())
        task.state = done["state"]
        self._record_completion(task_id)
        self._mirror(task)
        self._press_reset(task)
        self._save()

    def update_last_performed(
        self, task_id: str, performed_date: datetime | None = None
    ) -> None:
        """Update a task's last performed date (time-based tasks only)."""
        self.complete_task(task_id, performed_date)

    def increment_counter(self, task_id: str) -> None:
        """Increment a cycle task. Other trigger types are left unchanged."""
        task = self._tasks.get(task_id)
        if task is None or task_id not in self.hass.data[const.DOMAIN]["entities"]:
            raise RuntimeError("Task not found.")
        trigger = task.trigger or {}
        if trigger.get("type") != "cycle" or trigger.get("mode") not in ("manual", "run"):
            _LOGGER.info("Ignoring increment_counter for task %s", task_id)
            return
        observed = apply_observation(task.to_dict(), {"kind": "increment"}, self._zone())
        task.state = observed["state"]
        self._mirror(task)
        self._save()

    def apply_task_observation(self, task_id: str, observation: dict) -> None:
        """Record a listener sample on one task."""
        task = self._tasks.get(task_id)
        if task is None:
            return
        observed = apply_observation(task.to_dict(), observation, self._zone())
        task.state = observed["state"]
        self._mirror(task)

    def snooze_task(
        self, task_id: str, snooze_until: str | None = None, disable: bool = False
    ) -> None:
        """Snooze or disable a task without moving its due date."""
        task = self._tasks.get(task_id)
        if task is None or task_id not in self.hass.data[const.DOMAIN]["entities"]:
            raise RuntimeError("Task not found.")

        live = task.to_dict()
        live["enabled"] = True
        result = evaluate(live, dt_util.now(), self._zone(), 7)
        task.snooze_progress = 0 if result.progress is None else result.progress
        task.snooze_meters = [meter.progress for meter in result.meters]
        task.enabled = False
        task.snoozed_until = None if disable else snooze_until
        self._mirror(task)
        self._save()

    def enable_task(self, task_id: str) -> None:
        """Re-enable a snoozed or disabled task."""
        task = self._tasks.get(task_id)
        if task is None or task_id not in self.hass.data[const.DOMAIN]["entities"]:
            raise RuntimeError("Task not found.")

        task.enabled = True
        task.snoozed_until = None
        self._mirror(task)
        self._save()

    def _record_completion(self, source_id: str) -> None:
        """Advance tasks that become due after this one is completed."""
        for other in list(self._tasks.values()):
            if other.id == source_id or _after_target(other.trigger) != source_id:
                continue
            observed = apply_observation(
                other.to_dict(),
                {"kind": "source_completed", "source_task_id": source_id},
                self._zone(),
            )
            other.state = observed["state"]
            self._mirror(other)

    def _press_reset(self, task: UpkeepTask) -> None:
        """Press a device-life reset button after Done. A failure still leaves the task done."""
        trigger = task.trigger or {}
        entity_id = trigger.get("reset_entity_id")
        if trigger.get("type") != "device_life" or not entity_id:
            return

        async def _press() -> None:
            try:
                await self.hass.services.async_call(
                    "button",
                    "press",
                    {"entity_id": entity_id},
                    blocking=True,
                )
            except Exception as err:
                _LOGGER.warning("Upkeep reset button failed for %s: %s", task.id, err)
                catalog = notice_catalog(getattr(self.hass.config, "language", None))
                message = catalog.get("reset_failed", "Reset failed for {title}").format(
                    title=task.title
                )
                await self.hass.services.async_call(
                    "persistent_notification",
                    "create",
                    {
                        "title": catalog.get("title", "Upkeep"),
                        "message": message,
                        "notification_id": f"upkeep_reset_failed_{task.id}",
                    },
                    blocking=True,
                )

        self.hass.async_create_task(_press())

    def _mirror(self, task: UpkeepTask) -> None:
        """Copy the stored task onto its entity and refresh it."""
        entity = self.hass.data[const.DOMAIN]["entities"].get(task.id)
        if entity is None:
            return
        entity.task = task.to_dict()
        entity._attr_name = task.title
        entity.async_schedule_update_ha_state(force_refresh=True)

    def _zone(self) -> str:
        """Return the Home Assistant time zone name."""
        return getattr(self.hass.config, "time_zone", None) or "UTC"

    def _sync_listeners(self, catch_up_id: str | None = None) -> None:
        """Ask the listener registry to resubscribe, if it is running."""
        sync = self.hass.data.get(const.DOMAIN, {}).get("sync_listeners")
        if sync:
            sync(catch_up_id)

    def _dependency_cycle(self, task_id: str, trigger: dict) -> bool:
        """Return whether saving this trigger would loop task completions."""
        links = {
            other_id: _after_target(other.trigger)
            for other_id, other in self._tasks.items()
        }
        links[task_id] = _after_target(trigger)
        seen: set[str] = set()
        current = links.get(task_id)
        while current:
            if current == task_id or current in seen:
                return True
            seen.add(current)
            current = links.get(current)
        return False

    def _dismiss_notifications(self, task_id: str) -> None:
        """Dismiss persistent notifications left for a completed or deleted task."""
        notifications = self.hass.data.get("persistent_notification")
        if not isinstance(notifications, dict):
            return
        for notification_id in persistent_notification_ids(task_id):
            if notification_id not in notifications:
                continue
            self.hass.async_create_task(
                self.hass.services.async_call(
                    "persistent_notification",
                    "dismiss",
                    {"notification_id": notification_id},
                )
            )

    def _save(self) -> None:
        """Save tasks in the background."""
        self.hass.async_create_task(
            self._store.async_save([t.to_dict() for t in self._tasks.values()])
        )


def _after_target(trigger: dict | None) -> str | None:
    """Return the task id a completion link points at."""
    if not trigger or trigger.get("type") != "after_task":
        return None
    target = trigger.get("task_id")
    return str(target) if target else None


def _uses_performed_date(trigger: dict | None) -> bool:
    """Return whether a performed date changes this trigger's next due date."""
    if not trigger:
        return False
    kind = trigger.get("type")
    if kind in ("interval", "calendar"):
        return True
    if kind == "either":
        return any(_uses_performed_date(meter) for meter in trigger.get("meters") or [])
    return False


def _merge_legacy_updates(task: UpkeepTask, updated: dict) -> dict:
    """Fold flat interval and frequency fields into the trigger and state."""
    legacy = {key: updated.pop(key) for key in _LEGACY_UPDATE_FIELDS if key in updated}
    if not legacy:
        return updated
    trigger = dict(task.trigger or {})
    state = dict(task.state or {})
    if "interval_value" in legacy or "interval_type" in legacy:
        trigger["type"] = "interval"
        if "interval_value" in legacy:
            trigger["every"] = legacy["interval_value"]
        if "interval_type" in legacy:
            trigger["unit"] = legacy["interval_type"]
    if "frequency_target" in legacy or "watched_entity" in legacy:
        trigger["type"] = "cycle"
        if "frequency_target" in legacy:
            trigger["target"] = legacy["frequency_target"]
        if "watched_entity" in legacy:
            trigger["entity_id"] = legacy["watched_entity"]
            trigger["mode"] = "run" if legacy["watched_entity"] else trigger.get("mode", "manual")
            trigger.setdefault("running_state", "on")
            trigger.setdefault("minimum", {"value": 0, "unit": "seconds"})
    if "last_performed" in legacy:
        last = legacy["last_performed"]
        state["last_performed"] = last[:10] if isinstance(last, str) and last else None
    if "current_count" in legacy:
        state["count"] = legacy["current_count"]
    updated["trigger"] = trigger
    updated["state"] = state
    return updated

