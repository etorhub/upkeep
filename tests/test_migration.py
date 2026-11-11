"""Storage migration from flat tasks to trigger plus state."""

import importlib.util
import sys
from datetime import datetime, timezone
from pathlib import Path

_SPEC = importlib.util.spec_from_file_location(
    "upkeep_meters_migration",
    Path(__file__).resolve().parents[1] / "custom_components" / "upkeep" / "meters.py",
)
assert _SPEC is not None and _SPEC.loader is not None
meters = importlib.util.module_from_spec(_SPEC)
sys.modules[_SPEC.name] = meters
_SPEC.loader.exec_module(meters)

NOW = datetime(2026, 6, 15, 12, tzinfo=timezone.utc)
TZ = "UTC"


def _legacy_time() -> dict:
    return {
        "id": "time-1",
        "title": "Filter",
        "task_type": "time",
        "interval_value": 30,
        "interval_type": "days",
        "last_performed": "2026-06-01T00:00:00+00:00",
        "notified_due_on": "2026-07-01",
        "notified_before_due": None,
        "notified_frequency_due": False,
    }


def _legacy_frequency(watched: str | None) -> dict:
    task = {
        "id": "freq-1",
        "title": "Dishwasher",
        "task_type": "frequency",
        "frequency_target": 10,
        "current_count": 3,
        "notified_frequency_due": True,
    }
    if watched:
        task["watched_entity"] = watched
    return task


def test_time_task_migrates_and_matches_the_old_urgency() -> None:
    migrated = meters.migrate_task(_legacy_time())
    result = meters.evaluate(migrated, NOW, TZ, 7)

    assert migrated["task_type"] == "time"
    assert migrated["trigger"] == {"type": "interval", "every": 30, "unit": "days"}
    assert migrated["state"]["last_performed"] == "2026-06-01"
    assert "interval_value" not in migrated
    assert migrated["notified_cycle_key"] == "2026-07-01"
    assert "due" in migrated["notified_kinds"]
    assert result.urgency == "on_track"
    assert result.progress == 46.7
    assert result.next_due is not None
    assert result.next_due.date().isoformat() == "2026-07-01"


def test_frequency_with_entity_becomes_a_finished_run() -> None:
    migrated = meters.migrate_task(_legacy_frequency("sensor.dishwasher"))
    result = meters.evaluate(migrated, NOW, TZ, 7)

    assert migrated["task_type"] == "frequency"
    assert migrated["trigger"]["mode"] == "run"
    assert migrated["trigger"]["minimum"] == {"value": 0, "unit": "seconds"}
    assert migrated["trigger"]["running_state"] == "on"
    assert migrated["state"]["count"] == 3
    assert "watched_entity" not in migrated
    assert result.urgency == "on_track"
    assert result.progress == 30
    assert migrated["notified_cycle_key"] == "gen-0"
    assert "due" in migrated["notified_kinds"]


def test_frequency_without_entity_stays_manual() -> None:
    migrated = meters.migrate_task(_legacy_frequency(None))

    assert migrated["trigger"]["mode"] == "manual"
    assert migrated["trigger"]["entity_id"] is None


def test_second_migration_is_a_no_op() -> None:
    once = meters.migrate_task(_legacy_time())
    twice = meters.migrate_task(once)

    assert twice == once


def test_storage_list_migrates_every_task() -> None:
    migrated = meters.migrate_storage([_legacy_time(), _legacy_frequency("binary_sensor.pump")])

    assert [task["trigger"]["type"] for task in migrated] == ["interval", "cycle"]
