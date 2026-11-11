"""Data coordinator for Upkeep."""

import logging
from datetime import date, timedelta

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator
from homeassistant.util import dt as dt_util

from . import const
from .meters import evaluate
from .notices import (
    evaluate_notice,
    is_at_or_after_notify_time,
    notice_catalog,
    notice_message,
    parse_notify_clock,
)

_LOGGER = logging.getLogger(__name__)


class UpkeepCoordinator(DataUpdateCoordinator[None]):
    """Coordinator for polling task due dates and firing events."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            name=const.DOMAIN,
            update_interval=timedelta(seconds=const.COORDINATOR_UPDATE_INTERVAL),
        )
        self._last_due_task_ids: set[str] = set()
        self._notify_failures: set[str] = set()

    async def _async_update_data(self) -> None:
        """Poll, fire due events, and send scheduled notices."""
        if const.DOMAIN not in self.hass.data:
            return

        store = self.hass.data[const.DOMAIN].get("store")
        entities = self.hass.data[const.DOMAIN].get("entities", {})
        if not store or not entities:
            return

        now = dt_util.now()
        today = dt_util.as_local(now).date()
        currently_due: set[str] = set()

        for task_id, entity in entities.items():
            if not hasattr(entity, "task"):
                continue
            task = entity.task
            if not task.get("enabled", True):
                continue
            if _task_is_due(task, now, self.hass.config.time_zone):
                currently_due.add(task_id)

        # Fire events for tasks that newly became due. This stays independent
        # of the notification clock so automations keep their existing timing.
        for task_id in currently_due:
            if task_id not in self._last_due_task_ids:
                task_data = store.get(task_id)
                if task_data:
                    self._fire_task_due_event(task_id, task_data, entities.get(task_id))

        self._last_due_task_ids = currently_due

        # Auto-re-enable tasks when snoozed_until has passed
        for task_id, entity in entities.items():
            if not hasattr(entity, "task"):
                continue
            task = entity.task
            if not task.get("enabled") and task.get("snoozed_until"):
                try:
                    snooze_str = task["snoozed_until"]
                    if isinstance(snooze_str, str) and len(snooze_str) >= 10:
                        snooze_date = dt_util.parse_datetime(snooze_str[:10] + "T00:00:00")
                        if snooze_date:
                            snooze_local = dt_util.as_local(snooze_date)
                            now_local = dt_util.as_local(now)
                            if now_local >= snooze_local:
                                store.enable_task(task_id)
                                _LOGGER.debug("Auto-re-enabled task %s (snooze expired)", task_id)
                except Exception:
                    pass

        await self._async_send_notices(store, entities, today, dt_util.as_local(now))

    def _fire_task_due_event(self, task_id: str, task_data: dict, entity) -> None:
        """Fire upkeep_task_due when a task transitions to due."""
        entity_id = entity.entity_id if entity else None
        zone = self.hass.config.time_zone or "UTC"
        result = evaluate(task_data, dt_util.now(), zone, 7)
        self.hass.bus.async_fire(
            const.EVENT_TASK_DUE,
            {
                "task_id": task_id,
                "title": task_data.get("title", ""),
                "urgency": result.urgency,
                "entity_id": entity_id,
                "trigger_type": (task_data.get("trigger") or {}).get("type"),
                "progress": result.progress,
            },
        )

    async def _async_send_notices(self, store, entities, today: date, local_now) -> None:
        """Send at most one notice per task, at or after the integration time."""
        at_time = is_at_or_after_notify_time(local_now, self._notify_time())

        for task_id, entity in entities.items():
            if not hasattr(entity, "task"):
                continue
            task = entity.task
            if not task.get("enabled", True):
                continue

            result = evaluate(task, dt_util.now(), self.hass.config.time_zone or "UTC", 7)
            if result.urgency == "unknown" or result.urgency == "snoozed":
                continue
            decision = evaluate_notice(
                is_due=result.is_due,
                urgency=result.urgency,
                cycle_key=result.cycle_key,
                rule_key=result.rule.key,
                notify_when_due=bool(task.get("notify_when_due")),
                notify_before=bool(task.get("notify_before")),
                notified_cycle_key=task.get("notified_cycle_key"),
                notified_kinds=task.get("notified_kinds"),
            )
            if not at_time:
                continue
            if decision.send_due or decision.send_before:
                kind = "due" if decision.send_due else "before"
                sent = await self._async_deliver(task_id, task, kind, 0)
                if sent:
                    store.update_task(
                        task_id,
                        {
                            "notified_cycle_key": decision.cycle_key,
                            "notified_kinds": [kind],
                        },
                    )
            elif decision.rearm:
                store.update_task(
                    task_id,
                    {"notified_cycle_key": decision.cycle_key, "notified_kinds": []},
                )

    async def _async_deliver(self, task_id: str, task: dict, kind: str, days_remaining: int) -> bool:
        """Send one notice. A failure is not recorded, so the next poll retries."""
        service = task.get("notify_service") or "persistent_notification"
        if isinstance(service, str) and service.startswith("notify."):
            service = service[len("notify.") :]
        catalog = notice_catalog(getattr(self.hass.config, "language", None))
        title = task.get("title", "")
        message = catalog.get(kind, notice_message(title, kind=kind))
        if "{title}" in message:
            message = message.format(title=title)
        else:
            message = notice_message(title, kind=kind)
        failure_key = f"{task_id}:{service}"
        try:
            if service == "persistent_notification":
                await self.hass.services.async_call(
                    "persistent_notification",
                    "create",
                    {
                        "title": catalog.get("title", "Upkeep"),
                        "message": message,
                        "notification_id": f"upkeep_{kind}_{task_id}",
                    },
                    blocking=True,
                )
            elif service == "send_message" or not self.hass.services.has_service("notify", service):
                raise RuntimeError(f"Notify service {service} is not available")
            else:
                await self.hass.services.async_call(
                    "notify",
                    service,
                    {"title": catalog.get("title", "Upkeep"), "message": message},
                    blocking=True,
                )
        except Exception as err:
            if failure_key not in self._notify_failures:
                self._notify_failures.add(failure_key)
                _LOGGER.warning(
                    "Upkeep could not notify task %s via %s: %s", task_id, service, err
                )
            return False

        self._notify_failures.discard(failure_key)
        return True

    def _notify_time(self) -> str:
        """Return the configured local notify time, or 08:00."""
        entry_id = self.hass.data.get(const.DOMAIN, {}).get("entry_id")
        entry = (
            self.hass.config_entries.async_get_entry(entry_id) if entry_id else None
        )
        raw = const.DEFAULT_NOTIFY_TIME
        if entry is not None:
            raw = entry.options.get(
                "notify_time", entry.data.get("notify_time", const.DEFAULT_NOTIFY_TIME)
            )
        try:
            parse_notify_clock(str(raw))
        except (TypeError, ValueError):
            return const.DEFAULT_NOTIFY_TIME
        return str(raw)


def _task_is_due(task: dict, now, time_zone: str) -> bool:
    """Return whether a task counts as due for the bus event."""
    if not task.get("enabled", True) or not task.get("trigger"):
        return False
    return evaluate(task, now, time_zone or "UTC", 7).is_due
