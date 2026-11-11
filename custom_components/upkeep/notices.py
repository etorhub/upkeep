"""Pure rules for when an upkeep task should send a notice."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from dateutil.relativedelta import relativedelta

NOTIFY_UNITS = frozenset({"days", "weeks", "months"})
UNDATED_DUE_KEY = "undated"


@dataclass(frozen=True)
class TimeNotice:
    """What a time-based task should send for one poll."""

    due_key: str | None
    send_due: bool
    send_before: bool
    days_remaining: int


@dataclass(frozen=True)
class FrequencyNotice:
    """What a frequency-based task should send, and whether to arm it again."""

    send_due: bool
    rearm: bool


def add_interval(start: date, value: int, unit: str) -> date:
    """Return the due date for a schedule that starts on ``start``."""
    if unit == "weeks":
        return start + timedelta(weeks=value)
    if unit == "months":
        return start + relativedelta(months=value)
    return start + timedelta(days=value)


def subtract_lead(due: date, value: int, unit: str) -> date:
    """Return the first day of a coming-up window that ends on ``due``."""
    if unit == "weeks":
        return due - timedelta(weeks=value)
    if unit == "months":
        return due - relativedelta(months=value)
    return due - timedelta(days=value)


def time_task_is_due(
    *,
    today: date,
    last_performed: date | None,
    interval_value: int,
    interval_type: str,
) -> bool:
    """Return whether a time-based task is due on ``today``."""
    if last_performed is None:
        return True
    return today >= add_interval(last_performed, interval_value, interval_type)


def evaluate_time_notice(
    *,
    today: date,
    last_performed: date | None,
    interval_value: int,
    interval_type: str,
    notify_before: bool,
    notify_before_value: int,
    notify_before_unit: str,
    notify_when_due: bool,
    notified_before_due: str | None,
    notified_due_on: str | None,
) -> TimeNotice:
    """Decide the single notice, if any, for this cycle.

    A lead that reaches back to the completion date (or earlier) is skipped.
    That window is already open the morning after the task is done, so a
    coming-up notice would fire for the new cycle immediately.
    """
    if last_performed is None:
        send_due = notify_when_due and notified_due_on != UNDATED_DUE_KEY
        return TimeNotice(UNDATED_DUE_KEY, send_due, False, 0)

    due = add_interval(last_performed, interval_value, interval_type)
    due_key = due.isoformat()
    days_remaining = (due - today).days
    already_due = today >= due

    send_due = already_due and notify_when_due and notified_due_on != due_key
    send_before = False
    if notify_before and not already_due and notified_before_due != due_key:
        window_start = subtract_lead(due, notify_before_value, notify_before_unit)
        if window_start > last_performed and today >= window_start:
            send_before = True

    if send_due:
        send_before = False

    return TimeNotice(due_key, send_due, send_before, days_remaining)


def evaluate_frequency_notice(
    *,
    current_count: int,
    frequency_target: int,
    notify_when_due: bool,
    notified_frequency_due: bool,
) -> FrequencyNotice:
    """Send the due notice once when the counter reaches its target."""
    target = frequency_target if frequency_target > 0 else 1
    if current_count < target:
        return FrequencyNotice(False, notified_frequency_due)
    return FrequencyNotice(notify_when_due and not notified_frequency_due, False)


def is_at_or_after_notify_time(now: datetime, notify_time: str) -> bool:
    """Return whether ``now`` is at or after a local ``HH:MM`` or ``HH:MM:SS``."""
    hour, minute = parse_notify_clock(notify_time)
    return (now.hour, now.minute) >= (hour, minute)


def parse_notify_clock(notify_time: str) -> tuple[int, int]:
    """Parse a notify clock, raising ``ValueError`` when it is not a time."""
    parts = notify_time.strip().split(":")
    if len(parts) < 2:
        raise ValueError(f"Invalid notify time: {notify_time}")
    hour = int(parts[0])
    minute = int(parts[1])
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        raise ValueError(f"Invalid notify time: {notify_time}")
    return hour, minute


def notice_message(title: str, *, kind: str, days_remaining: int = 0) -> str:
    """Build the notification body for a due or coming-up notice."""
    if kind == "before":
        if days_remaining == 1:
            return f"Task due in 1 day: {title}"
        return f"Task due in {days_remaining} days: {title}"
    return f"Task due: {title}"


def normalize_notify_service(service: str | None) -> str | None:
    """Store a notify service name, without the ``notify.`` domain prefix."""
    if service is None:
        return None
    cleaned = service.strip()
    if not cleaned:
        return None
    if cleaned.startswith("notify."):
        cleaned = cleaned[len("notify.") :]
    if cleaned == "send_message":
        raise ValueError("send_message is not a notification target")
    return cleaned


def validate_notice_updates(updates: dict) -> str | None:
    """Return an error message when notice fields in an update are invalid."""
    if "notify_before" in updates and not isinstance(updates["notify_before"], bool):
        return "notify_before must be a boolean"
    if "notify_when_due" in updates and not isinstance(updates["notify_when_due"], bool):
        return "notify_when_due must be a boolean"
    if "notify_before_value" in updates:
        value = updates["notify_before_value"]
        if isinstance(value, bool) or not isinstance(value, int) or value < 1:
            return "notify_before_value must be an integer of at least 1"
    if "notify_before_unit" in updates and updates["notify_before_unit"] not in NOTIFY_UNITS:
        return "notify_before_unit must be days, weeks, or months"
    if "notify_service" in updates:
        try:
            updates["notify_service"] = normalize_notify_service(updates["notify_service"])
        except ValueError as err:
            return str(err)
    return None


def persistent_notification_ids(task_id: str) -> tuple[str, ...]:
    """Ids used for this task's persistent notifications, including the legacy id."""
    return (
        f"upkeep_before_{task_id}",
        f"upkeep_due_{task_id}",
        f"upkeep_{task_id}",
        f"upkeep_reset_failed_{task_id}",
    )


def notice_catalog(language: str | None) -> dict[str, str]:
    """Load notice strings for a language, falling back to English.

    The files live in ``strings/``. Hassfest rejects custom keys in ``translations/``.
    """
    import json
    from pathlib import Path

    directory = Path(__file__).parent / "strings"
    code = (language or "en").split("-")[0]
    path = directory / f"{code}.json"
    if not path.exists():
        path = directory / "en.json"
    document = json.loads(path.read_text(encoding="utf-8"))
    return {key: value for key, value in document.items() if isinstance(value, str)}


@dataclass(frozen=True)
class NoticeDecision:
    """Whether to send a due or due-soon notice for the current meter cycle."""

    cycle_key: str
    send_due: bool
    send_before: bool
    rearm: bool


def evaluate_notice(
    *,
    is_due: bool,
    urgency: str,
    cycle_key: str,
    rule_key: str,
    notify_when_due: bool,
    notify_before: bool,
    notified_cycle_key: str | None,
    notified_kinds: list | None,
) -> NoticeDecision:
    """Decide the single notice for this cycle. Latches have no due-soon notice."""
    same_cycle = notified_cycle_key == cycle_key
    sent = set(notified_kinds or []) if same_cycle else set()
    latch = rule_key in {"rule.event_state", "rule.event_bus"}
    send_due = bool(is_due and notify_when_due and "due" not in sent)
    send_before = bool(
        not latch
        and urgency == "due_soon"
        and notify_before
        and "before" not in sent
        and not send_due
    )
    rearm = bool(notified_kinds) and not same_cycle
    return NoticeDecision(cycle_key, send_due, send_before, rearm)
