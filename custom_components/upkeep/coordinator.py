"""Data coordinator for Upkeep."""

import logging
from datetime import date, timedelta

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator
from homeassistant.util import dt as dt_util

from . import const
from .notices import (
    evaluate_frequency_notice,
    evaluate_time_notice,
    is_at_or_after_notify_time,
    notice_message,
    parse_notify_clock,
    time_task_is_due,
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
            if _task_is_due(task, today):
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
        urgency = "overdue"
        if entity and hasattr(entity, "_attr_extra_state_attributes"):
            urgency = entity._attr_extra_state_attributes.get("urgency", "overdue")

        self.hass.bus.async_fire(
            const.EVENT_TASK_DUE,
            {
                "task_id": task_id,
                "title": task_data.get("title", ""),
                "urgency": urgency,
                "entity_id": entity_id,
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

            if task.get("task_type") == const.TASK_TYPE_FREQUENCY:
                decision = evaluate_frequency_notice(
                    current_count=task.get("current_count", 0),
                    frequency_target=task.get("frequency_target") or 1,
                    notify_when_due=bool(task.get("notify_when_due")),
                    notified_frequency_due=bool(task.get("notified_frequency_due")),
                )
                if decision.rearm:
                    store.update_task(task_id, {"notified_frequency_due": False})
                if at_time and decision.send_due:
                    sent = await self._async_deliver(task_id, task, "due", 0)
                    if sent:
                        store.update_task(task_id, {"notified_frequency_due": True})
                continue

            if not at_time:
                continue

            decision = evaluate_time_notice(
                today=today,
                last_performed=_local_date(task.get("last_performed")),
                interval_value=task.get("interval_value", 30),
                interval_type=task.get("interval_type", "days"),
                notify_before=bool(task.get("notify_before")),
                notify_before_value=task.get("notify_before_value") or 7,
                notify_before_unit=task.get("notify_before_unit") or "days",
                notify_when_due=bool(task.get("notify_when_due")),
                notified_before_due=task.get("notified_before_due"),
                notified_due_on=task.get("notified_due_on"),
            )
            if decision.send_due:
                sent = await self._async_deliver(task_id, task, "due", decision.days_remaining)
                if sent and decision.due_key:
                    store.update_task(task_id, {"notified_due_on": decision.due_key})
            elif decision.send_before:
                sent = await self._async_deliver(
                    task_id, task, "before", decision.days_remaining
                )
                if sent and decision.due_key:
                    store.update_task(task_id, {"notified_before_due": decision.due_key})

    async def _async_deliver(self, task_id: str, task: dict, kind: str, days_remaining: int) -> bool:
        """Send one notice. A failure is not recorded, so the next poll retries."""
        service = task.get("notify_service") or "persistent_notification"
        if isinstance(service, str) and service.startswith("notify."):
            service = service[len("notify.") :]
        title = task.get("title", "")
        message = notice_message(title, kind=kind, days_remaining=days_remaining)
        failure_key = f"{task_id}:{service}"
        try:
            if service == "persistent_notification":
                await self.hass.services.async_call(
                    "persistent_notification",
                    "create",
                    {
                        "title": "Upkeep",
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
                    {"title": "Upkeep", "message": message},
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


def _local_date(value: str | None) -> date | None:
    """Parse a stored timestamp into a local calendar date."""
    if not value:
        return None
    parsed = dt_util.parse_datetime(value)
    if parsed is None and len(value) >= 10:
        parsed = dt_util.parse_datetime(value[:10] + "T00:00:00")
    if parsed is None:
        return None
    return dt_util.as_local(parsed).date()


def _task_is_due(task: dict, today: date) -> bool:
    """Return whether a task counts as due for the bus event."""
    if task.get("task_type") == const.TASK_TYPE_FREQUENCY:
        target = task.get("frequency_target") or 1
        return task.get("current_count", 0) >= target
    last = _local_date(task.get("last_performed"))
    if task.get("last_performed") and last is None:
        return True
    return time_task_is_due(
        today=today,
        last_performed=last,
        interval_value=task.get("interval_value", 30),
        interval_type=task.get("interval_type", "days"),
    )
