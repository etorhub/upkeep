"""Listener subscription sets, without a Home Assistant runtime."""

import importlib.util
import sys
from pathlib import Path

_SPEC = importlib.util.spec_from_file_location(
    "upkeep_meters_listeners",
    Path(__file__).resolve().parents[1] / "custom_components" / "upkeep" / "meters.py",
)
assert _SPEC is not None and _SPEC.loader is not None
meters = importlib.util.module_from_spec(_SPEC)
sys.modules[_SPEC.name] = meters
_SPEC.loader.exec_module(meters)


def _targets(tasks: list[dict]) -> tuple[set[str], set[str]]:
    entities: set[str] = set()
    events: set[str] = set()
    for task in tasks:
        watched = meters.trigger_watches(task.get("trigger") or {})
        entities.update(watched["entities"])
        events.update(watched["events"])
    return entities, events


def test_adding_a_watched_entity_changes_the_subscription_set() -> None:
    before = _targets([{"trigger": {"type": "interval", "every": 30, "unit": "days"}}])
    after = _targets(
        [
            {"trigger": {"type": "interval", "every": 30, "unit": "days"}},
            {
                "trigger": {
                    "type": "cycle",
                    "mode": "run",
                    "entity_id": "sensor.dishwasher",
                    "target": 10,
                }
            },
        ]
    )

    assert before == (set(), set())
    assert after[0] == {"sensor.dishwasher"}


def test_event_trigger_subscribes_to_the_bus_event_only() -> None:
    entities, events = _targets(
        [
            {
                "trigger": {
                    "type": "event",
                    "source": "event",
                    "event_type": "custom_alert",
                }
            }
        ]
    )

    assert entities == set()
    assert events == {"custom_alert"}


def test_unavailable_startup_does_not_increment_a_cycle() -> None:
    task = {
        "enabled": True,
        "trigger": {
            "type": "cycle",
            "mode": "run",
            "entity_id": "sensor.dishwasher",
            "target": 10,
            "running_state": "on",
            "minimum": {"value": 0, "unit": "seconds"},
        },
        "state": {"count": 1, "run_started_at": None, "generation": 0},
    }
    updated = meters.apply_observation(
        task,
        {
            "kind": "startup",
            "entity_id": "sensor.dishwasher",
            "state": "unavailable",
            "at": "2026-11-11T12:00:00+00:00",
        },
        "UTC",
    )

    assert updated["state"]["count"] == 1
