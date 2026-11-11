"""Lead-window rules for task notifications."""

import importlib.util
import sys
from datetime import date, datetime
from pathlib import Path

_SPEC = importlib.util.spec_from_file_location(
    "upkeep_notices",
    Path(__file__).resolve().parents[1] / "custom_components" / "upkeep" / "notices.py",
)
assert _SPEC is not None and _SPEC.loader is not None
_NOTICES = importlib.util.module_from_spec(_SPEC)
sys.modules[_SPEC.name] = _NOTICES
_SPEC.loader.exec_module(_NOTICES)

evaluate_frequency_notice = _NOTICES.evaluate_frequency_notice
evaluate_notice = _NOTICES.evaluate_notice
evaluate_time_notice = _NOTICES.evaluate_time_notice
is_at_or_after_notify_time = _NOTICES.is_at_or_after_notify_time


def _notice(**overrides):
    values = {
        "today": date(2026, 1, 25),
        "last_performed": date(2026, 1, 1),
        "interval_value": 30,
        "interval_type": "days",
        "notify_before": True,
        "notify_before_value": 7,
        "notify_before_unit": "days",
        "notify_when_due": True,
        "notified_before_due": None,
        "notified_due_on": None,
    }
    values.update(overrides)
    return evaluate_time_notice(**values)


def test_inside_the_lead_window_sends_only_the_coming_up_notice():
    notice = _notice()

    assert notice.send_before is True
    assert notice.send_due is False
    assert notice.due_key == "2026-01-31"
    assert notice.days_remaining == 6


def test_already_due_sends_only_the_due_notice():
    notice = _notice(today=date(2026, 2, 1))

    assert notice.send_due is True
    assert notice.send_before is False


def test_lead_that_opens_on_the_completion_date_is_not_upcoming():
    notice = _notice(
        today=date(2026, 1, 2),
        last_performed=date(2026, 1, 1),
        interval_value=7,
        notify_before_value=7,
    )

    assert notice.send_before is False
    assert notice.due_key == "2026-01-08"


def test_lead_longer_than_the_interval_sends_nothing_upcoming():
    notice = _notice(
        today=date(2026, 1, 15),
        notify_before_value=2,
        notify_before_unit="months",
    )

    assert notice.send_before is False
    assert notice.send_due is False


def test_recorded_due_date_does_not_send_again():
    upcoming = _notice(notified_before_due="2026-01-31")
    due = _notice(today=date(2026, 2, 1), notified_due_on="2026-01-31")

    assert upcoming.send_before is False
    assert due.send_due is False


def test_notify_time_gate_uses_local_clock():
    morning = datetime(2026, 1, 25, 7, 59)
    at_eight = datetime(2026, 1, 25, 8, 0)

    assert is_at_or_after_notify_time(morning, "08:00") is False
    assert is_at_or_after_notify_time(at_eight, "08:00:00") is True


def test_frequency_due_notice_is_once_until_the_count_drops():
    reached = evaluate_frequency_notice(
        current_count=10,
        frequency_target=10,
        notify_when_due=True,
        notified_frequency_due=False,
    )
    already_sent = evaluate_frequency_notice(
        current_count=10,
        frequency_target=10,
        notify_when_due=True,
        notified_frequency_due=True,
    )
    reset = evaluate_frequency_notice(
        current_count=2,
        frequency_target=10,
        notify_when_due=True,
        notified_frequency_due=True,
    )

    assert reached.send_due is True
    assert reached.rearm is False
    assert already_sent.send_due is False
    assert reset.send_due is False
    assert reset.rearm is True


def test_meter_notice_sends_due_soon_once_per_cycle_and_skips_latches():
    coming = evaluate_notice(
        is_due=False,
        urgency="due_soon",
        cycle_key="2026-07-01",
        rule_key="rule.interval",
        notify_when_due=True,
        notify_before=True,
        notified_cycle_key=None,
        notified_kinds=[],
    )
    again = evaluate_notice(
        is_due=False,
        urgency="due_soon",
        cycle_key="2026-07-01",
        rule_key="rule.interval",
        notify_when_due=True,
        notify_before=True,
        notified_cycle_key="2026-07-01",
        notified_kinds=["before"],
    )
    latch = evaluate_notice(
        is_due=True,
        urgency="overdue",
        cycle_key="gen-0",
        rule_key="rule.event_state",
        notify_when_due=True,
        notify_before=True,
        notified_cycle_key=None,
        notified_kinds=[],
    )
    unknown = evaluate_notice(
        is_due=False,
        urgency="unknown",
        cycle_key="gen-0",
        rule_key="rule.device_life",
        notify_when_due=True,
        notify_before=True,
        notified_cycle_key=None,
        notified_kinds=[],
    )

    assert coming.send_before is True
    assert coming.send_due is False
    assert again.send_before is False
    assert latch.send_due is True
    assert latch.send_before is False
    assert unknown.send_due is False
    assert unknown.send_before is False
