"""Subscribe task triggers to entity state and bus events."""

from __future__ import annotations

from datetime import timedelta
import logging

from homeassistant.const import EVENT_HOMEASSISTANT_STOP
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event, async_track_time_interval
from homeassistant.util import dt as dt_util

from . import const
from .meters import evaluate, trigger_watches

_LOGGER = logging.getLogger(__name__)
_USAGE_INTERVAL = timedelta(seconds=30)


class TriggerWatch:
    """Keeps one subscription set for every task trigger."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the registry."""
        self.hass = hass
        self._unsubs: list = []
        self._dirty = False

    def async_close(self) -> None:
        """Flush pending samples and drop every subscription."""
        self._flush()
        self._clear()

    def sync(self, catch_up_id: str | None = None) -> None:
        """Resubscribe, and sample one task when it was just created or retargeted."""
        self._resubscribe()
        if catch_up_id:
            self._catch_up(catch_up_id)

    def catch_up_all(self) -> None:
        """Apply the current entity state to every task after startup."""
        store = self._store()
        if store is None:
            return
        for task_id in list(store._tasks):
            self._catch_up(task_id)
        self._flush()

    def _resubscribe(self) -> None:
        self._clear()
        store = self._store()
        if store is None:
            return
        entities: set[str] = set()
        events: set[str] = set()
        for task in store._tasks.values():
            watched = trigger_watches(task.trigger or {})
            entities.update(watched["entities"])
            events.update(watched["events"])
        if entities:
            self._unsubs.append(
                async_track_state_change_event(
                    self.hass, list(entities), self._state_changed
                )
            )
        for event_type in sorted(events):
            self._unsubs.append(self.hass.bus.async_listen(event_type, self._bus_event))
        self._unsubs.append(
            async_track_time_interval(self.hass, self._tick, _USAGE_INTERVAL)
        )
        self._unsubs.append(
            self.hass.bus.async_listen(EVENT_HOMEASSISTANT_STOP, self._stop)
        )
        _LOGGER.debug("Upkeep watching %s entities and %s events", len(entities), len(events))

    def _clear(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()

    @callback
    def _tick(self, _now) -> None:
        self._flush()

    @callback
    def _stop(self, _event: Event) -> None:
        self._flush()

    @callback
    def _state_changed(self, event: Event) -> None:
        entity_id = event.data.get("entity_id")
        if not entity_id:
            return
        self._apply_matching(entity_id, _observation_from_event(event))

    @callback
    def _bus_event(self, event: Event) -> None:
        store = self._store()
        if store is None:
            return
        observation = {
            "kind": "event",
            "event_type": event.event_type,
            "data": dict(event.data),
            "at": dt_util.now(),
        }
        for task in list(store._tasks.values()):
            if event.event_type not in trigger_watches(task.trigger or {})["events"]:
                continue
            self._apply(task.id, observation)

    def _apply_matching(self, entity_id: str, observation: dict) -> None:
        store = self._store()
        if store is None:
            return
        for task in list(store._tasks.values()):
            if entity_id not in trigger_watches(task.trigger or {})["entities"]:
                continue
            self._apply(task.id, observation)

    def _apply(self, task_id: str, observation: dict) -> None:
        store = self._store()
        if store is None or task_id not in store._tasks:
            return
        task = store._tasks[task_id]
        zone = store._zone()
        before = evaluate(task.to_dict(), dt_util.now(), zone, 7)
        store.apply_task_observation(task_id, observation)
        updated = store._tasks.get(task_id)
        after = evaluate(updated.to_dict(), dt_util.now(), zone, 7) if updated else before
        crossed = before.urgency != after.urgency or before.is_due != after.is_due
        if crossed or (task.trigger or {}).get("type") != "usage":
            store._save()
        else:
            self._dirty = True

    def _catch_up(self, task_id: str) -> None:
        store = self._store()
        task = store._tasks.get(task_id) if store else None
        if task is None:
            return
        for entity_id in trigger_watches(task.trigger or {})["entities"]:
            state = self.hass.states.get(entity_id)
            attributes = dict(state.attributes) if state is not None else {}
            self._apply(
                task_id,
                {
                    "kind": "startup",
                    "entity_id": entity_id,
                    "state": state.state if state is not None else "unavailable",
                    "attributes": attributes,
                    "unit": attributes.get("unit_of_measurement"),
                    "at": dt_util.now(),
                },
            )

    def _flush(self) -> None:
        if not self._dirty:
            return
        store = self._store()
        if store is not None:
            store._save()
        self._dirty = False

    def _store(self):
        return self.hass.data.get(const.DOMAIN, {}).get("store")


def _observation_from_event(event: Event) -> dict:
    old_state = event.data.get("old_state")
    new_state = event.data.get("new_state")
    attributes = dict(getattr(new_state, "attributes", {}) or {})
    return {
        "kind": "state",
        "entity_id": event.data.get("entity_id"),
        "state": getattr(new_state, "state", None),
        "old_state": getattr(old_state, "state", None),
        "attributes": attributes,
        "unit": attributes.get("unit_of_measurement"),
        "at": dt_util.now(),
    }


def setup_entity_watch(hass: HomeAssistant):
    """Start listeners and return an unsubscribe callback."""
    watch = TriggerWatch(hass)
    hass.data.setdefault(const.DOMAIN, {})["sync_listeners"] = watch.sync
    watch.sync()
    watch.catch_up_all()
    return watch.async_close
