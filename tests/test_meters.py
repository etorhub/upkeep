"""Table-driven coverage for the due-trigger engine."""

import importlib.util
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

_SPEC = importlib.util.spec_from_file_location(
    "upkeep_meters",
    Path(__file__).resolve().parents[1] / "custom_components" / "upkeep" / "meters.py",
)
assert _SPEC is not None and _SPEC.loader is not None
meters = importlib.util.module_from_spec(_SPEC)
sys.modules[_SPEC.name] = meters
_SPEC.loader.exec_module(meters)

TZ = "Europe/Madrid"


def _at(year: int, month: int, day: int, hour: int = 12) -> datetime:
    return datetime(year, month, day, hour, tzinfo=timezone.utc)


def _task(trigger: dict, state: dict | None = None, **extra: object) -> dict:
    return {
        "id": "task",
        "title": extra.pop("title", "Task"),
        "enabled": True,
        "trigger": trigger,
        "state": state if state is not None else meters.fresh_state(trigger),
        **extra,
    }


def test_interval_day_zero_is_on_track() -> None:
    task = _task(
        {"type": "interval", "every": 90, "unit": "days"},
        {"last_performed": "2026-08-13", "generation": 0},
    )
    fresh = meters.evaluate(task, _at(2026, 8, 13), TZ)
    near_term = meters.evaluate(task, _at(2026, 10, 19), TZ)

    assert fresh.progress == 0
    assert fresh.urgency == "on_track"
    assert fresh.status.key == "status.in_months_on_date"
    assert fresh.is_due is False
    assert fresh.tag is None
    assert near_term.status.key == "status.days_left"
    assert near_term.status.vars["count"] == 23
    assert near_term.urgency == "on_track"


def test_interval_due_soon_and_overdue() -> None:
    task = _task(
        {"type": "interval", "every": 90, "unit": "days"},
        {"last_performed": "2026-08-13", "generation": 0},
    )
    soon = meters.evaluate(task, _at(2026, 11, 4), TZ)
    overdue = meters.evaluate(task, _at(2026, 11, 15), TZ)

    assert soon.urgency == "due_soon"
    assert soon.status.key == "status.days_left"
    assert soon.tag is not None and soon.tag.key == "tag.due_soon"
    assert overdue.urgency == "overdue"
    assert overdue.is_due is True
    assert overdue.status.key == "status.overdue_days"
    assert overdue.status.vars["count"] == 4
    assert overdue.tag is None


def test_interval_without_a_completion_is_overdue() -> None:
    task = _task({"type": "interval", "every": 90, "unit": "days"})
    result = meters.evaluate(task, _at(2026, 11, 11), TZ)

    assert result.progress == 100
    assert result.urgency == "overdue"
    assert result.cycle_key == "undated"


def test_interval_done_starts_a_new_cycle() -> None:
    task = _task(
        {"type": "interval", "every": 90, "unit": "days"},
        {"last_performed": "2026-01-01", "generation": 0},
    )
    done = meters.apply_done(task, _at(2026, 11, 11), TZ)

    assert done["state"]["last_performed"] == "2026-11-11"
    assert done["state"]["generation"] == 1


def test_interval_snooze_freezes_progress_and_is_not_due() -> None:
    task = _task(
        {"type": "interval", "every": 90, "unit": "days"},
        {"last_performed": "2026-01-01", "generation": 0},
        enabled=False,
        snoozed_until="2026-11-20",
        snooze_progress=42,
    )
    result = meters.evaluate(task, _at(2026, 11, 11), TZ)

    assert result.progress == 42
    assert result.urgency == "snoozed"
    assert result.is_due is False
    assert result.status.key == "status.snoozed_until"
    assert result.status.vars["date"] == "2026-11-20"


def test_cycle_phrases_and_done() -> None:
    trigger = {
        "type": "cycle",
        "entity_id": "sensor.dishwasher",
        "target": 10,
        "mode": "run",
        "running_state": "on",
        "minimum": {"value": 0, "unit": "seconds"},
    }
    early = meters.evaluate(_task(trigger, {"count": 3, "generation": 0}), _at(2026, 11, 11), TZ)
    near = meters.evaluate(_task(trigger, {"count": 9, "generation": 0}), _at(2026, 11, 11), TZ)
    due = meters.evaluate(_task(trigger, {"count": 10, "generation": 0}), _at(2026, 11, 11), TZ)
    done = meters.apply_done(_task(trigger, {"count": 10, "generation": 2}), _at(2026, 11, 11), TZ)

    assert early.status.key == "status.count_of"
    assert early.status.vars == {"current": 3, "target": 10}
    assert early.urgency == "on_track"
    assert near.urgency == "due_soon"
    assert near.status.key == "status.count_left"
    assert due.urgency == "overdue"
    assert due.status.key == "status.due"
    assert due.tag is None
    assert done["state"]["count"] == 0
    assert done["state"]["generation"] == 3


def test_finished_run_respects_minimum_and_ignores_flaps() -> None:
    trigger = {
        "type": "cycle",
        "entity_id": "sensor.dishwasher",
        "target": 10,
        "mode": "run",
        "running_state": "on",
        "minimum": {"value": 60, "unit": "seconds"},
    }
    task = _task(trigger, {"count": 0, "run_started_at": None, "generation": 0})
    started = datetime(2026, 11, 11, 8, 0, tzinfo=timezone.utc)
    running = meters.apply_observation(
        task,
        {"kind": "state", "entity_id": "sensor.dishwasher", "state": "on", "old_state": "off", "at": started},
        TZ,
    )
    flap = meters.apply_observation(
        running,
        {
            "kind": "state",
            "entity_id": "sensor.dishwasher",
            "state": "on",
            "old_state": "on",
            "at": started + timedelta(seconds=10),
        },
        TZ,
    )
    too_short = meters.apply_observation(
        flap,
        {
            "kind": "state",
            "entity_id": "sensor.dishwasher",
            "state": "off",
            "old_state": "on",
            "at": started + timedelta(seconds=10),
        },
        TZ,
    )
    qualified = meters.apply_observation(
        running,
        {
            "kind": "state",
            "entity_id": "sensor.dishwasher",
            "state": "off",
            "old_state": "on",
            "at": started + timedelta(seconds=61),
        },
        TZ,
    )

    assert flap["state"]["count"] == 0
    assert too_short["state"]["count"] == 0
    assert too_short["state"]["run_started_at"] is None
    assert qualified["state"]["count"] == 1


def test_startup_counts_a_run_that_finished_offline() -> None:
    trigger = {
        "type": "cycle",
        "entity_id": "sensor.dishwasher",
        "target": 10,
        "mode": "run",
        "running_state": "on",
        "minimum": {"value": 60, "unit": "seconds"},
    }
    started = datetime(2026, 11, 11, 8, 0, tzinfo=timezone.utc)
    task = _task(trigger, {"count": 2, "run_started_at": started.isoformat(), "generation": 0})
    caught = meters.apply_observation(
        task,
        {
            "kind": "startup",
            "entity_id": "sensor.dishwasher",
            "state": "off",
            "at": started + timedelta(minutes=30),
        },
        TZ,
    )

    assert caught["state"]["count"] == 3
    assert caught["state"]["run_started_at"] is None


def test_counter_attribute_increments_and_missing_is_unknown() -> None:
    trigger = {
        "type": "cycle",
        "entity_id": "sensor.washer",
        "target": 10,
        "mode": "counter",
        "attribute": "cycle_count",
    }
    task = _task(trigger, {"count": 1, "last_reading": 5, "generation": 0})
    stepped = meters.apply_observation(
        task,
        {
            "kind": "state",
            "entity_id": "sensor.washer",
            "state": "100",
            "attributes": {"cycle_count": 7},
            "at": _at(2026, 11, 11),
        },
        TZ,
    )
    missing = meters.apply_observation(
        _task(trigger),
        {
            "kind": "state",
            "entity_id": "sensor.washer",
            "state": "100",
            "attributes": {},
            "at": _at(2026, 11, 11),
        },
        TZ,
    )
    result = meters.evaluate(missing, _at(2026, 11, 11), TZ)

    assert stepped["state"]["count"] == 3
    assert result.urgency == "unknown"
    assert result.is_due is False


def test_manual_increment() -> None:
    trigger = {"type": "cycle", "entity_id": None, "target": 4, "mode": "manual"}
    task = _task(trigger, {"count": 1, "generation": 0})
    updated = meters.apply_observation(task, {"kind": "increment"}, TZ)

    assert updated["state"]["count"] == 2


def test_either_follows_the_leading_meter_and_resets_both() -> None:
    trigger = {
        "type": "either",
        "meters": [
            {"id": "age", "type": "interval", "every": 6, "unit": "months"},
            {
                "id": "runtime",
                "type": "usage",
                "entity_id": "sensor.pump",
                "threshold": 200,
                "unit": "h",
            },
        ],
    }
    task = _task(
        trigger,
        {
            "generation": 0,
            "meters": {
                "age": {"last_performed": "2026-01-01", "generation": 0},
                "runtime": {
                    "baseline": 0,
                    "accumulated": 80,
                    "last_sample": 80,
                    "unit_at_bind": "h",
                    "unit_mismatch": False,
                    "generation": 0,
                },
            },
        },
    )
    result = meters.evaluate(task, _at(2026, 6, 1), TZ)
    done = meters.apply_done(task, _at(2026, 6, 1), TZ)

    assert result.progress == 100 or result.meters[0].leading or result.meters[1].leading
    leading = next(meter for meter in result.meters if meter.leading)
    assert leading.progress == result.progress
    assert len(result.meters) == 2
    assert done["state"]["meters"]["runtime"]["accumulated"] == 0
    assert done["state"]["meters"]["age"]["last_performed"] == "2026-06-01"


def test_either_rejects_a_single_meter() -> None:
    assert meters.validate_trigger({"type": "either", "meters": [{"id": "only", "type": "interval", "every": 1, "unit": "days"}]})


def test_usage_progress_reset_and_done() -> None:
    trigger = {"type": "usage", "entity_id": "sensor.vacuum", "threshold": 10, "unit": "h"}
    task = _task(
        trigger,
        {
            "baseline": 40,
            "accumulated": 6.5,
            "last_sample": 46.5,
            "unit_at_bind": "h",
            "unit_mismatch": False,
            "generation": 0,
        },
    )
    result = meters.evaluate(task, _at(2026, 11, 11), TZ)
    near = meters.evaluate(
        _task(trigger, {**task["state"], "accumulated": 9.2, "last_sample": 49.2}),
        _at(2026, 11, 11),
        TZ,
    )
    reset = meters.apply_observation(
        task,
        {"kind": "state", "entity_id": "sensor.vacuum", "state": "1.0", "unit": "h", "at": _at(2026, 11, 11)},
        TZ,
    )
    mismatch = meters.apply_observation(
        task,
        {"kind": "state", "entity_id": "sensor.vacuum", "state": "50", "unit": "km", "at": _at(2026, 11, 11)},
        TZ,
    )
    done = meters.apply_done(task, _at(2026, 11, 11), TZ)
    waiting = meters.evaluate(_task(trigger), _at(2026, 11, 11), TZ)

    assert result.status.key == "status.usage_of"
    assert result.status.vars["current"] == 6.5
    assert result.status.vars["limit"] == 10
    assert result.urgency == "on_track"
    assert near.urgency == "due_soon"
    assert reset["state"]["accumulated"] == 7.5
    assert meters.evaluate(mismatch, _at(2026, 11, 11), TZ).urgency == "unknown"
    assert done["state"]["baseline"] == 46.5
    assert done["state"]["accumulated"] == 0
    assert waiting.status.key == "status.waiting_reading"
    assert waiting.urgency == "unknown"


def test_calendar_phrase_leap_day_and_early_done() -> None:
    trigger = {"type": "calendar", "rule": "month_day", "month": 4, "day": 1, "repeat": "year"}
    task = _task(trigger, {"last_completed_occurrence": "2026-04-01", "generation": 0})
    soon_window = meters.evaluate(task, _at(2027, 3, 14), TZ)
    due = meters.evaluate(task, _at(2027, 4, 1), TZ)
    done = meters.apply_done(task, _at(2026, 11, 11), TZ)
    after = meters.evaluate(done, _at(2026, 11, 12), TZ)
    leap = meters._clamp_date(2027, 2, 29)
    month_end = meters._monthly_on_or_after(datetime(2026, 6, 1).date(), 31)

    assert soon_window.status.key == "status.in_days_on_date"
    assert soon_window.status.vars["count"] == 18
    assert soon_window.status.vars["date"] == "2027-04-01"
    assert soon_window.urgency == "on_track"
    assert due.urgency == "overdue"
    assert done["state"]["last_completed_occurrence"] == "2026-04-01"
    assert after.next_due is not None
    assert after.next_due.date().isoformat() == "2027-04-01"
    assert leap.isoformat() == "2027-02-28"
    assert month_end.isoformat() == "2026-06-30"


def test_calendar_dst_preset_finds_a_transition() -> None:
    trigger = {"type": "calendar", "rule": "dst_forward", "hemisphere": "north"}
    nxt = meters._next_occurrence_on_or_after(trigger, datetime(2026, 1, 1).date(), TZ)

    assert nxt is not None
    assert nxt.year == 2026
    assert nxt.month == 3


def test_idle_resets_when_the_device_runs_and_counts_downtime() -> None:
    trigger = {
        "type": "idle",
        "entity_id": "sensor.washer",
        "running_state": "on",
        "limit": {"value": 14, "unit": "days"},
    }
    active = datetime(2026, 11, 2, 8, 0, tzinfo=timezone.utc)
    task = _task(trigger, {"last_active": active.isoformat(), "generation": 0})
    mid = meters.evaluate(task, _at(2026, 11, 11), TZ)
    due = meters.evaluate(task, _at(2026, 11, 16), TZ)
    ran = meters.apply_observation(
        task,
        {"kind": "state", "entity_id": "sensor.washer", "state": "on", "at": _at(2026, 11, 11)},
        TZ,
    )
    unavailable = meters.apply_observation(
        task,
        {"kind": "state", "entity_id": "sensor.washer", "state": "unavailable", "at": _at(2026, 11, 12)},
        TZ,
    )
    done = meters.apply_done(task, _at(2026, 11, 11), TZ)

    assert mid.status.key == "status.idle_of"
    assert mid.status.vars["current"] == 9
    assert due.urgency == "overdue"
    assert ran["state"]["last_active"].startswith("2026-11-11")
    assert unavailable["state"]["last_active"] == task["state"]["last_active"]
    assert done["state"]["last_active"].startswith("2026-11-11")


def test_device_life_left_used_missing_and_done_keeps_the_reading() -> None:
    trigger = {
        "type": "device_life",
        "entity_id": "sensor.filter_life",
        "reading": "state",
        "scale": "left",
        "reset_entity_id": "button.filter_reset",
    }
    healthy = meters.evaluate(_task(trigger, {"value": 40, "missing": False, "generation": 0}), _at(2026, 11, 11), TZ)
    low = meters.evaluate(_task(trigger, {"value": 15, "missing": False, "generation": 0}), _at(2026, 11, 11), TZ)
    empty = meters.evaluate(_task(trigger, {"value": 0, "missing": False, "generation": 0}), _at(2026, 11, 11), TZ)
    unknown = meters.evaluate(_task(trigger, {"value": None, "missing": True, "generation": 0}), _at(2026, 11, 11), TZ)
    used = meters.evaluate(
        _task(
            {**trigger, "scale": "used"},
            {"value": 80, "missing": False, "generation": 0},
        ),
        _at(2026, 11, 11),
        TZ,
    )
    done = meters.apply_done(_task(trigger, {"value": 40, "missing": False, "generation": 0}), _at(2026, 11, 11), TZ)

    assert healthy.progress == 60
    assert healthy.status.key == "status.life_left"
    assert healthy.status.vars["percent"] == 40
    assert healthy.urgency == "on_track"
    assert low.urgency == "due_soon"
    assert empty.urgency == "overdue"
    assert unknown.urgency == "unknown"
    assert unknown.is_due is False
    assert unknown.status.key == "status.life_unknown"
    assert used.progress == 80
    assert used.urgency == "due_soon"
    assert done["state"]["value"] == 40
    assert meters.describe_done(trigger).key == "done.device_life_reset"


def test_condition_watch_hold_release_and_unavailable_gap() -> None:
    trigger = {
        "type": "condition",
        "entity_id": "sensor.humidity",
        "operator": "gt",
        "threshold": 70,
        "duration": {"value": 3, "unit": "days"},
    }
    watching = meters.evaluate(_task(trigger), _at(2026, 11, 11), TZ)
    held = _task(
        trigger,
        {"holding_since": "2026-11-09T10:00:00+00:00", "held_seconds": 0, "latched": False, "paused": False, "generation": 0},
    )
    mid = meters.evaluate(held, datetime(2026, 11, 11, 10, 0, tzinfo=timezone.utc), TZ)
    paused = meters.apply_observation(
        held,
        {"kind": "state", "entity_id": "sensor.humidity", "state": "unavailable", "at": datetime(2026, 11, 11, 10, 0, tzinfo=timezone.utc)},
        TZ,
    )
    cleared = meters.apply_observation(
        held,
        {"kind": "state", "entity_id": "sensor.humidity", "state": "40", "at": datetime(2026, 11, 11, 10, 0, tzinfo=timezone.utc)},
        TZ,
    )
    done = meters.apply_done(held, datetime(2026, 11, 11, 10, 0, tzinfo=timezone.utc), TZ)

    assert watching.status.key == "status.watching"
    assert watching.done_enabled is False
    assert watching.urgency == "on_track"
    assert mid.status.key == "status.condition_above"
    assert mid.status.vars["elapsed"] == 2
    assert mid.urgency == "on_track"
    assert paused["state"]["paused"] is True
    assert paused["state"]["holding_since"] is None
    assert cleared["state"]["latched"] is False
    assert cleared["state"]["holding_since"] is None
    assert done["state"]["latched"] is False
    assert done["state"]["holding_since"] is not None


def test_event_latches_once_and_done_rearms() -> None:
    trigger = {"type": "event", "source": "state", "entity_id": "binary_sensor.mains", "to_state": "on"}
    armed = meters.evaluate(_task(trigger), _at(2026, 11, 11), TZ)
    latched = meters.apply_observation(
        _task(trigger),
        {
            "kind": "state",
            "entity_id": "binary_sensor.mains",
            "state": "on",
            "old_state": "off",
            "at": _at(2026, 11, 11),
        },
        TZ,
    )
    again = meters.apply_observation(
        latched,
        {
            "kind": "state",
            "entity_id": "binary_sensor.mains",
            "state": "on",
            "old_state": "off",
            "at": _at(2026, 11, 12),
        },
        TZ,
    )
    startup = meters.apply_observation(
        _task(trigger),
        {"kind": "startup", "entity_id": "binary_sensor.mains", "state": "on", "at": _at(2026, 11, 11)},
        TZ,
    )
    result = meters.evaluate(latched, _at(2026, 11, 11), TZ)
    done = meters.apply_done(latched, _at(2026, 11, 11), TZ)
    snoozed = dict(latched)
    snoozed["enabled"] = False
    snoozed["snooze_progress"] = 0
    hidden = meters.evaluate(snoozed, _at(2026, 11, 11), TZ)

    assert armed.status.key == "status.watching"
    assert armed.done_enabled is False
    assert latched["state"]["latched"] is True
    assert again["state"]["latched_at"] == latched["state"]["latched_at"]
    assert startup["state"]["latched"] is False
    assert result.progress == 100
    assert result.status.key == "status.due"
    assert result.is_due is True
    assert done["state"]["latched"] is False
    assert hidden.is_due is False
    assert hidden.urgency == "snoozed"
    assert meters.validate_trigger({"type": "event", "source": "event", "event_type": "state_changed"})


def test_after_task_counts_completions_and_a_missing_source() -> None:
    trigger = {"type": "after_task", "task_id": "lint-trap", "every": 4}
    early = meters.evaluate(_task(trigger, {"count": 1, "source_missing": False, "generation": 0}), _at(2026, 11, 11), TZ)
    near = meters.evaluate(_task(trigger, {"count": 3, "source_missing": False, "generation": 0}), _at(2026, 11, 11), TZ)
    counted = meters.apply_observation(
        _task(trigger, {"count": 1, "source_missing": False, "generation": 0}),
        {"kind": "source_completed", "source_task_id": "lint-trap"},
        TZ,
    )
    missing = meters.apply_observation(
        _task(trigger, {"count": 1, "source_missing": False, "generation": 0}),
        {"kind": "source_missing", "source_task_id": "lint-trap"},
        TZ,
    )
    missing_result = meters.evaluate(missing, _at(2026, 11, 11), TZ)
    done = meters.apply_done(counted, _at(2026, 11, 11), TZ)

    assert early.status.key == "status.after_count"
    assert early.status.vars["current"] == 1
    assert early.status.vars["target"] == 4
    assert near.urgency == "due_soon"
    assert near.status.key == "status.after_left"
    assert counted["state"]["count"] == 2
    assert missing_result.urgency == "unknown"
    assert missing_result.status.key == "status.linked_missing"
    assert missing_result.is_due is False
    assert done["state"]["count"] == 0


def test_event_data_filter_and_rejected_types() -> None:
    trigger = {
        "type": "event",
        "source": "event",
        "event_type": "custom_alert",
        "data": {"area": "kitchen"},
    }
    matched = meters.apply_observation(
        _task(trigger),
        {"kind": "event", "event_type": "custom_alert", "data": {"area": "kitchen"}, "at": _at(2026, 11, 11)},
        TZ,
    )
    skipped = meters.apply_observation(
        _task(trigger),
        {"kind": "event", "event_type": "custom_alert", "data": {"area": "hall"}, "at": _at(2026, 11, 11)},
        TZ,
    )

    assert matched["state"]["latched"] is True
    assert skipped["state"]["latched"] is False
    assert meters.validate_trigger(trigger) == []


def test_attributes_keep_legacy_interval_fields() -> None:
    task = _task(
        {"type": "interval", "every": 90, "unit": "days"},
        {"last_performed": "2026-08-13", "generation": 0},
        task_type="time",
        icon="mdi:air-filter",
    )
    result = meters.evaluate(task, _at(2026, 8, 13), TZ)
    attrs = meters.entity_attributes(task, result)

    assert attrs["upkeep_schema"] == 2
    assert attrs["task_type"] == "time"
    assert attrs["trigger_type"] == "interval"
    assert attrs["interval_value"] == 90
    assert attrs["last_performed"] == "2026-08-13"
    assert attrs["progress"] == 0
    assert "status_key" in attrs
