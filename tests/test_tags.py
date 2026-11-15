"""NFC tag scans complete the linked tasks."""

import importlib.util
import sys
from pathlib import Path

_SPEC = importlib.util.spec_from_file_location(
    "upkeep_tags",
    Path(__file__).resolve().parents[1] / "custom_components" / "upkeep" / "tags.py",
)
assert _SPEC is not None and _SPEC.loader is not None
tags = importlib.util.module_from_spec(_SPEC)
sys.modules[_SPEC.name] = tags
_SPEC.loader.exec_module(tags)


class FakeStore:
    """Mimics the tag lookups and completion of TaskStore."""

    def __init__(self, tasks, by_uuid=None, broken=()):
        self.tasks = tasks
        self.by_uuid = by_uuid or {}
        self.broken = set(broken)
        self.calls = []

    def get_by_tag_uuid(self, tag_uuid):
        return [t for t in self.tasks if self.by_uuid.get(t.get("tag_id")) == tag_uuid]

    def get_by_tag_id(self, tag_id):
        return [t for t in self.tasks if t.get("tag_id") == tag_id]

    def update_last_performed(self, task_id, performed_date=None, source="service", event_data=None):
        if task_id in self.broken:
            raise RuntimeError("Task not found.")
        self.calls.append((task_id, source, event_data))


def _task(task_id, tag_id="tag.garage", enabled=True):
    return {"id": task_id, "title": task_id, "tag_id": tag_id, "enabled": enabled}


def test_a_tag_entity_id_matches_through_the_registry_uuid() -> None:
    store = FakeStore([_task("a")], by_uuid={"tag.garage": "uuid-1"})
    done = tags.complete_for_scan(store, "uuid-1")
    assert [t["id"] for t in done] == ["a"]
    assert store.calls[0][1] == "nfc"


def test_a_raw_tag_id_matches_directly() -> None:
    store = FakeStore([_task("a", tag_id="uuid-1")])
    assert [t["id"] for t in tags.complete_for_scan(store, "uuid-1")] == ["a"]


def test_a_task_matched_both_ways_completes_once() -> None:
    store = FakeStore([_task("a", tag_id="uuid-1")], by_uuid={"uuid-1": "uuid-1"})
    tags.complete_for_scan(store, "uuid-1")
    assert len(store.calls) == 1


def test_one_tag_completes_every_linked_task() -> None:
    store = FakeStore([_task("a"), _task("b"), _task("c", tag_id="tag.other")], by_uuid={"tag.garage": "u"})
    done = tags.complete_for_scan(store, "u")
    assert sorted(t["id"] for t in done) == ["a", "b"]


def test_unknown_tag_completes_nothing() -> None:
    store = FakeStore([_task("a")], by_uuid={"tag.garage": "u"})
    assert tags.complete_for_scan(store, "nope") == []
    assert store.calls == []


def test_disabled_tasks_are_skipped() -> None:
    store = FakeStore([_task("a", enabled=False), _task("b")], by_uuid={"tag.garage": "u"})
    assert [t["id"] for t in tags.complete_for_scan(store, "u")] == ["b"]


def test_one_failing_task_does_not_stop_the_others() -> None:
    store = FakeStore([_task("a"), _task("b")], by_uuid={"tag.garage": "u"}, broken={"a"})
    assert [t["id"] for t in tags.complete_for_scan(store, "u")] == ["b"]


def test_the_scan_is_passed_to_the_completed_event() -> None:
    store = FakeStore([_task("a")], by_uuid={"tag.garage": "u"})
    tags.complete_for_scan(store, "u", "device-9")
    assert store.calls[0][2] == {"tag_id": "u", "device_id": "device-9"}
