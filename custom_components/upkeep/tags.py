"""Complete tasks when an NFC tag is scanned.

Kept free of Home Assistant imports so it can be tested with a fake store.
"""

import logging

_LOGGER = logging.getLogger(__name__)

SOURCE_NFC = "nfc"


def tasks_for_scan(store, tag_id: str) -> list[dict]:
    """Return the tasks linked to a scanned tag, each once.

    A task links a tag by its ``tag.*`` entity id (what the panel stores) or by
    the raw tag id. The scan event carries the tag id, so both are checked.
    """
    seen: set[str] = set()
    tasks: list[dict] = []
    for task in [*store.get_by_tag_uuid(tag_id), *store.get_by_tag_id(tag_id)]:
        if task["id"] in seen:
            continue
        seen.add(task["id"])
        tasks.append(task)
    return tasks


def complete_for_scan(store, tag_id: str, device_id: str | None = None) -> list[dict]:
    """Complete every enabled task linked to the tag; return the ones completed.

    One failing task is logged and skipped so it cannot block the others.
    """
    completed: list[dict] = []
    for task in tasks_for_scan(store, tag_id):
        if not task.get("enabled", True):
            continue
        try:
            store.update_last_performed(
                task["id"],
                source=SOURCE_NFC,
                event_data={"tag_id": tag_id, "device_id": device_id},
            )
        except RuntimeError as err:
            _LOGGER.warning("Could not complete %s from tag %s: %s", task["id"], tag_id, err)
            continue
        completed.append(task)
    return completed
