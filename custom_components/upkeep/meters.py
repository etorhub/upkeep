"""Pure due-trigger rules for Upkeep.

No Home Assistant imports. Callers pass datetimes and a time zone name.
"""

from __future__ import annotations

import copy
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from dateutil.relativedelta import relativedelta

TRIGGER_TYPES = (
    "interval",
    "cycle",
    "either",
    "usage",
    "calendar",
    "idle",
    "device_life",
    "condition",
    "event",
    "after_task",
)
EITHER_METER_TYPES = frozenset({"interval", "cycle", "usage", "calendar", "idle"})
REJECTED_EVENTS = frozenset({"state_changed", "call_service", "*"})
CALENDAR_PRESETS = frozenset(
    {
        "dst_forward",
        "dst_back",
        "season_spring",
        "season_summer",
        "season_autumn",
        "season_winter",
    }
)
SEASONS_NORTH = {
    "season_spring": (3, 1),
    "season_summer": (6, 1),
    "season_autumn": (9, 1),
    "season_winter": (12, 1),
}
SEASONS_SOUTH = {
    "season_spring": (9, 1),
    "season_summer": (12, 1),
    "season_autumn": (3, 1),
    "season_winter": (6, 1),
}
MONTH_DAYS = 60
UPKEEP_SCHEMA = 2

LEGACY_SCHEDULE_FIELDS = (
    "interval_value",
    "interval_type",
    "last_performed",
    "frequency_target",
    "current_count",
    "watched_entity",
)
LEGACY_NOTICE_FIELDS = (
    "notified_before_due",
    "notified_due_on",
    "notified_frequency_due",
)


@dataclass(frozen=True)
class StatusPart:
    """A localized phrase: catalog key plus scalar values."""

    key: str
    vars: dict[str, str | int | float] = field(default_factory=dict)


@dataclass(frozen=True)
class MeterView:
    """One progress meter."""

    id: str
    progress: float | None
    leading: bool
    status: StatusPart


@dataclass(frozen=True)
class MeterResult:
    """What the sensor, notices, and UI render for one task."""

    progress: float | None
    urgency: str
    is_due: bool
    done_enabled: bool
    status: StatusPart
    tag: StatusPart | None
    rule: StatusPart
    done_effect: StatusPart
    meters: list[MeterView]
    next_due: datetime | None
    cycle_key: str


def evaluate(
    task: dict,
    now: datetime,
    time_zone: str,
    due_soon_days: int = 7,
) -> MeterResult:
    """Compute progress, urgency, and status for a stored task."""
    live = _evaluate_live(task, now, time_zone, due_soon_days)
    if task.get("enabled", True):
        return live
    progress = task.get("snooze_progress")
    if progress is None:
        progress = 0
    until = task.get("snoozed_until")
    if until:
        status = StatusPart("status.snoozed_until", {"date": str(until)[:10]})
    else:
        status = StatusPart("status.snoozed", {})
    meters = list(live.meters)
    frozen = task.get("snooze_meters")
    if isinstance(frozen, list) and len(frozen) == len(meters):
        meters = [
            MeterView(meter.id, _num(value), meter.leading, meter.status)
            for meter, value in zip(meters, frozen)
        ]
    return MeterResult(
        progress=_round_progress(float(progress)),
        urgency="snoozed",
        is_due=False,
        done_enabled=True,
        status=status,
        tag=None,
        rule=live.rule,
        done_effect=live.done_effect,
        meters=meters,
        next_due=live.next_due,
        cycle_key=live.cycle_key,
    )


def apply_done(task: dict, performed_at: datetime, time_zone: str) -> dict:
    """Return a copy of the task with this meter's runtime reset."""
    task = copy.deepcopy(task)
    trigger = task.get("trigger") or {}
    state = task.setdefault("state", {})
    kind = trigger.get("type")
    if kind == "either":
        meters = state.setdefault("meters", {})
        for meter in trigger.get("meters") or []:
            meter_id = str(meter.get("id"))
            sub = {
                "trigger": meter,
                "state": meters.get(meter_id) or fresh_state(meter),
                "enabled": True,
            }
            done = apply_done(sub, performed_at, time_zone)
            meters[meter_id] = done["state"]
    elif kind == "interval":
        state["last_performed"] = _as_local(performed_at, time_zone).date().isoformat()
    elif kind == "cycle":
        state["count"] = 0
        state["run_started_at"] = None
    elif kind == "usage":
        if state.get("last_sample") is not None:
            state["baseline"] = state.get("last_sample")
        state["accumulated"] = 0
        state["unit_mismatch"] = False
    elif kind == "calendar":
        occurred = _latest_occurrence_on_or_before(trigger, performed_at, time_zone)
        if occurred is not None:
            state["last_completed_occurrence"] = occurred.isoformat()
    elif kind == "idle":
        state["last_active"] = _as_local(performed_at, time_zone).isoformat()
    elif kind == "condition":
        was_holding = bool(state.get("holding_since") or state.get("latched"))
        state["latched"] = False
        state["held_seconds"] = 0
        state["paused"] = False
        if was_holding:
            state["holding_since"] = _as_local(performed_at, time_zone).isoformat()
        else:
            state["holding_since"] = None
    elif kind == "event":
        state["latched"] = False
        state["latched_at"] = None
    elif kind == "after_task":
        state["count"] = 0
    state["generation"] = int(state.get("generation") or 0) + 1
    return task


def apply_observation(task: dict, observation: dict, time_zone: str) -> dict:
    """Return a copy of the task after one listener sample."""
    task = copy.deepcopy(task)
    trigger = task.get("trigger") or {}
    state = task.setdefault("state", {})
    kind = trigger.get("type")
    obs_kind = observation.get("kind")
    if obs_kind == "increment":
        if kind == "cycle" and trigger.get("mode") in ("manual", "run"):
            state["count"] = _num(state.get("count")) + 1
        return task
    if kind == "either":
        meters = state.setdefault("meters", {})
        for meter in trigger.get("meters") or []:
            if not _meter_watches(meter, observation):
                continue
            meter_id = str(meter.get("id"))
            sub = {
                "trigger": meter,
                "state": meters.get(meter_id) or fresh_state(meter),
                "enabled": True,
            }
            updated = apply_observation(sub, observation, time_zone)
            meters[meter_id] = updated["state"]
        return task
    if kind == "cycle":
        _observe_cycle(trigger, state, observation)
    elif kind == "usage":
        _observe_usage(trigger, state, observation)
    elif kind == "idle":
        _observe_idle(trigger, state, observation, time_zone)
    elif kind == "device_life":
        _observe_device_life(trigger, state, observation)
    elif kind == "condition":
        _observe_condition(trigger, state, observation, time_zone)
    elif kind == "event":
        _observe_event(trigger, state, observation, time_zone)
    elif kind == "after_task":
        _observe_after_task(trigger, state, observation)
    return task


def describe_rule(trigger: dict) -> StatusPart:
    """One-line rule summary for a trigger, saved or still a draft."""
    return _rule(trigger or {})


def describe_done(trigger: dict) -> StatusPart:
    """What Done will do for a trigger."""
    return _done_effect(trigger or {})


def fresh_state(trigger: dict) -> dict:
    """Runtime state for a new trigger of this shape."""
    kind = (trigger or {}).get("type")
    if kind == "interval":
        return {"last_performed": None, "generation": 0}
    if kind == "cycle":
        return {"count": 0, "run_started_at": None, "last_reading": None, "generation": 0}
    if kind == "usage":
        return {
            "baseline": None,
            "accumulated": 0,
            "last_sample": None,
            "unit_at_bind": None,
            "unit_mismatch": False,
            "generation": 0,
        }
    if kind == "calendar":
        return {"last_completed_occurrence": None, "generation": 0}
    if kind == "idle":
        return {"last_active": None, "generation": 0}
    if kind == "device_life":
        return {"value": None, "missing": True, "generation": 0}
    if kind == "condition":
        return {
            "holding_since": None,
            "held_seconds": 0,
            "latched": False,
            "paused": False,
            "generation": 0,
        }
    if kind == "event":
        return {"latched": False, "latched_at": None, "generation": 0}
    if kind == "after_task":
        return {"count": 0, "source_missing": False, "generation": 0}
    if kind == "either":
        return {
            "meters": {
                str(meter.get("id")): fresh_state(meter)
                for meter in trigger.get("meters") or []
            },
            "generation": 0,
        }
    return {"generation": 0}


def validate_trigger(trigger: dict) -> list[str]:
    """Return error keys for a trigger. An empty list means it can be stored."""
    if not isinstance(trigger, dict):
        return ["trigger.errors.missing"]
    kind = trigger.get("type")
    if kind not in TRIGGER_TYPES:
        return ["trigger.errors.type"]
    errors: list[str] = []
    if kind == "interval":
        if _num(trigger.get("every")) < 1:
            errors.append("trigger.errors.every")
        if trigger.get("unit") not in ("days", "weeks", "months"):
            errors.append("trigger.errors.unit")
    elif kind == "cycle":
        if _num(trigger.get("target")) < 1:
            errors.append("trigger.errors.target")
        mode = trigger.get("mode")
        if mode not in ("run", "counter", "manual"):
            errors.append("trigger.errors.mode")
        if mode in ("run", "counter") and not trigger.get("entity_id"):
            errors.append("trigger.errors.entity")
        if mode == "counter" and not trigger.get("attribute"):
            errors.append("trigger.errors.attribute")
        if mode == "run":
            minimum = trigger.get("minimum") or {}
            if _num(minimum.get("value")) < 0:
                errors.append("trigger.errors.minimum")
    elif kind == "usage":
        if not trigger.get("entity_id"):
            errors.append("trigger.errors.entity")
        if _num(trigger.get("threshold")) <= 0:
            errors.append("trigger.errors.threshold")
        if not trigger.get("unit"):
            errors.append("trigger.errors.unit")
    elif kind == "calendar":
        errors.extend(_validate_calendar(trigger))
    elif kind == "idle":
        if not trigger.get("entity_id"):
            errors.append("trigger.errors.entity")
        limit = trigger.get("limit") or {}
        if _num(limit.get("value")) < 1:
            errors.append("trigger.errors.limit")
    elif kind == "device_life":
        if not trigger.get("entity_id"):
            errors.append("trigger.errors.entity")
        if trigger.get("scale") not in ("left", "used"):
            errors.append("trigger.errors.scale")
        reset = trigger.get("reset_entity_id")
        if reset and not str(reset).startswith("button."):
            errors.append("trigger.errors.reset_button")
    elif kind == "condition":
        if not trigger.get("entity_id"):
            errors.append("trigger.errors.entity")
        if trigger.get("operator") not in ("gt", "gte", "lt", "lte", "eq", "neq"):
            errors.append("trigger.errors.operator")
        duration = trigger.get("duration") or {}
        if _num(duration.get("value")) < 1:
            errors.append("trigger.errors.duration")
    elif kind == "event":
        errors.extend(_validate_event(trigger))
    elif kind == "after_task":
        if not trigger.get("task_id"):
            errors.append("trigger.errors.task")
        if _num(trigger.get("every")) < 1:
            errors.append("trigger.errors.every")
    elif kind == "either":
        meters = trigger.get("meters")
        if not isinstance(meters, list) or len(meters) != 2:
            errors.append("trigger.errors.meters")
        else:
            for meter in meters:
                if not isinstance(meter, dict) or meter.get("type") not in EITHER_METER_TYPES:
                    errors.append("trigger.errors.meter_type")
                    continue
                if not meter.get("id"):
                    errors.append("trigger.errors.meter_id")
                errors.extend(validate_trigger(meter))
    return errors


def trigger_watches(trigger: dict) -> dict:
    """Entities and bus events this trigger needs listeners for."""
    kind = (trigger or {}).get("type")
    entities: list[str] = []
    events: list[str] = []
    if kind == "either":
        for meter in trigger.get("meters") or []:
            nested = trigger_watches(meter)
            entities.extend(nested["entities"])
            events.extend(nested["events"])
    elif kind in ("cycle", "usage", "idle", "device_life", "condition"):
        if trigger.get("entity_id"):
            entities.append(trigger["entity_id"])
    elif kind == "event":
        if trigger.get("source") == "event" and trigger.get("event_type"):
            events.append(trigger["event_type"])
        elif trigger.get("entity_id"):
            entities.append(trigger["entity_id"])
    return {"entities": entities, "events": events}


def runtime_binding(trigger: dict) -> str:
    """Identity of the entity or attribute. Changing it resets runtime state."""
    kind = (trigger or {}).get("type")
    if kind == "cycle":
        return f"{trigger.get('entity_id')}|{trigger.get('mode')}|{trigger.get('attribute')}"
    if kind in ("usage", "idle", "device_life", "condition"):
        return f"{trigger.get('entity_id')}|{trigger.get('reading')}|{trigger.get('attribute')}"
    if kind == "event":
        return f"{trigger.get('source')}|{trigger.get('entity_id')}|{trigger.get('event_type')}|{trigger.get('to_state')}"
    if kind == "after_task":
        return str(trigger.get("task_id") or "")
    if kind == "either":
        return "|".join(
            f"{meter.get('id')}:{runtime_binding(meter)}" for meter in trigger.get("meters") or []
        )
    return kind or ""


def public_task_type(trigger_type: str, existing: str | None = None) -> str:
    """Compatibility task_type stored beside the trigger."""
    if trigger_type == "interval":
        return "time"
    if trigger_type == "cycle":
        return "frequency"
    if existing in ("time", "frequency") and trigger_type in ("interval", "cycle"):
        return existing
    return trigger_type


def trigger_from_legacy(data: dict) -> tuple[dict, dict]:
    """Map a flat 1.2 task onto a trigger and runtime state."""
    task_type = data.get("task_type") or "time"
    if task_type == "frequency":
        watched = data.get("watched_entity") or None
        target = data.get("frequency_target") or 1
        if watched:
            trigger = {
                "type": "cycle",
                "entity_id": watched,
                "target": target,
                "mode": "run",
                "running_state": "on",
                "minimum": {"value": 0, "unit": "seconds"},
            }
        else:
            trigger = {
                "type": "cycle",
                "entity_id": None,
                "target": target,
                "mode": "manual",
            }
        state = fresh_state(trigger)
        state["count"] = data.get("current_count") or 0
        return trigger, state
    trigger = {
        "type": "interval",
        "every": data.get("interval_value") or 30,
        "unit": data.get("interval_type") or "days",
    }
    state = fresh_state(trigger)
    last = data.get("last_performed")
    if last == "":
        last = None
    if isinstance(last, str) and len(last) >= 10:
        state["last_performed"] = last[:10]
    return trigger, state


def migrate_task(data: dict) -> dict:
    """Convert one stored task to the 1.3 shape. Idempotent."""
    if not isinstance(data, dict):
        return data
    out = copy.deepcopy(data)
    if not isinstance(out.get("trigger"), dict):
        task_type = out.get("task_type", "time")
        if task_type not in ("time", "frequency", None) and "interval_value" not in out:
            return data
        trigger, state = trigger_from_legacy(out)
        out["trigger"] = trigger
        out["state"] = state
        out["task_type"] = public_task_type(trigger["type"], out.get("task_type"))
    kinds = list(out.get("notified_kinds") or [])
    cycle_key = out.get("notified_cycle_key")
    if out.get("notified_due_on"):
        if "due" not in kinds:
            kinds.append("due")
        cycle_key = cycle_key or out["notified_due_on"]
    if out.get("notified_before_due"):
        if "before" not in kinds:
            kinds.append("before")
        cycle_key = cycle_key or out["notified_before_due"]
    if out.get("notified_frequency_due"):
        if "due" not in kinds:
            kinds.append("due")
        cycle_key = cycle_key or "gen-0"
    out["notified_kinds"] = kinds
    out["notified_cycle_key"] = cycle_key
    for key in LEGACY_NOTICE_FIELDS + LEGACY_SCHEDULE_FIELDS:
        out.pop(key, None)
    if "snooze_progress" not in out:
        out["snooze_progress"] = None
    return out


def migrate_storage(data: list | None) -> list:
    """Migrate a storage document, which is a list of tasks."""
    if not data:
        return []
    migrated = []
    for task in data:
        try:
            migrated.append(migrate_task(task))
        except (TypeError, ValueError, KeyError):
            migrated.append(task)
    return migrated


def result_to_dict(result: MeterResult) -> dict:
    """JSON-ready preview payload."""

    def part(value: StatusPart | None) -> dict | None:
        if value is None:
            return None
        return {"key": value.key, "vars": value.vars}

    return {
        "progress": result.progress,
        "urgency": result.urgency,
        "is_due": result.is_due,
        "done_enabled": result.done_enabled,
        "status": part(result.status),
        "tag": part(result.tag),
        "rule": part(result.rule),
        "done_effect": part(result.done_effect),
        "meters": [
            {
                "id": meter.id,
                "progress": meter.progress,
                "leading": meter.leading,
                "status_key": meter.status.key,
                "status_vars": meter.status.vars,
            }
            for meter in result.meters
        ],
        "next_due": result.next_due.isoformat() if result.next_due else None,
        "cycle_key": result.cycle_key,
    }


def entity_attributes(task: dict, result: MeterResult) -> dict:
    """Attribute contract published on the binary sensor."""
    trigger = task.get("trigger") or {}
    kind = trigger.get("type")
    state = task.get("state") or {}
    attributes: dict = {
        "task_id": task.get("id"),
        "icon": task.get("icon") or "mdi:calendar-check",
        "task_type": task.get("task_type") or public_task_type(kind or ""),
        "trigger_type": kind,
        "upkeep_schema": UPKEEP_SCHEMA,
        "description": task.get("description"),
        "assigned_user": task.get("assigned_user"),
        "enabled": task.get("enabled", True),
        "snoozed_until": task.get("snoozed_until"),
        "urgency": result.urgency,
        "is_due": result.is_due,
        "done_enabled": result.done_enabled,
        "status_key": result.status.key,
        "status_vars": result.status.vars,
        "rule_key": result.rule.key,
        "rule_vars": result.rule.vars,
        "cycle_key": result.cycle_key,
        "next_due": result.next_due.isoformat() if result.next_due else None,
        "meters": [
            {
                "id": meter.id,
                "progress": meter.progress,
                "leading": meter.leading,
                "status_key": meter.status.key,
                "status_vars": meter.status.vars,
            }
            for meter in result.meters
        ],
    }
    if result.progress is not None:
        attributes["progress"] = result.progress
    if result.tag is not None:
        attributes["tag_key"] = result.tag.key
        attributes["tag_vars"] = result.tag.vars
    if task.get("tag_id"):
        attributes["tag_id"] = task["tag_id"]
    if kind == "interval":
        attributes["interval_value"] = trigger.get("every")
        attributes["interval_type"] = trigger.get("unit")
        attributes["last_performed"] = state.get("last_performed") or ""
        attributes["days_remaining"] = _days_var(result)
    elif kind == "cycle":
        attributes["frequency_target"] = trigger.get("target")
        attributes["current_count"] = state.get("count") or 0
        attributes["watched_entity"] = trigger.get("entity_id")
        attributes["days_remaining"] = 0
    return attributes


def _evaluate_live(
    task: dict,
    now: datetime,
    time_zone: str,
    due_soon_days: int,
) -> MeterResult:
    trigger = task.get("trigger") or {}
    state = task.get("state") or {}
    kind = trigger.get("type")
    if kind == "either":
        return _evaluate_either(task, now, time_zone, due_soon_days)
    if kind == "interval":
        return _evaluate_interval(trigger, state, now, time_zone, due_soon_days)
    if kind == "cycle":
        return _evaluate_cycle(trigger, state)
    if kind == "usage":
        return _evaluate_usage(trigger, state)
    if kind == "calendar":
        return _evaluate_calendar(trigger, state, now, time_zone, due_soon_days)
    if kind == "idle":
        return _evaluate_idle(trigger, state, now, time_zone, due_soon_days)
    if kind == "device_life":
        return _evaluate_device_life(trigger, state)
    if kind == "condition":
        return _evaluate_condition(trigger, state, now, time_zone)
    if kind == "event":
        return _evaluate_event(trigger, state)
    if kind == "after_task":
        return _evaluate_after_task(trigger, state)
    return _pack(
        trigger,
        progress=None,
        urgency="unknown",
        is_due=False,
        done_enabled=True,
        status=StatusPart("status.unknown", {}),
        cycle_key="unknown",
    )


def _evaluate_either(
    task: dict,
    now: datetime,
    time_zone: str,
    due_soon_days: int,
) -> MeterResult:
    trigger = task.get("trigger") or {}
    state = task.get("state") or {}
    stored = (state.get("meters") or {}) if isinstance(state.get("meters"), dict) else {}
    views: list[MeterResult] = []
    for meter in trigger.get("meters") or []:
        meter_id = str(meter.get("id"))
        sub_task = {
            "trigger": meter,
            "state": stored.get(meter_id) or fresh_state(meter),
            "enabled": True,
        }
        views.append(_evaluate_live(sub_task, now, time_zone, due_soon_days))
    if len(views) < 2:
        return _pack(
            trigger,
            progress=None,
            urgency="unknown",
            is_due=False,
            done_enabled=False,
            status=StatusPart("status.unknown", {}),
            cycle_key="either",
        )
    leading_index = 0
    best = -1.0
    for index, view in enumerate(views):
        score = view.progress if view.progress is not None else -1
        if score > best:
            best = score
            leading_index = index
    meters = [
        MeterView(
            str((trigger.get("meters") or [])[index].get("id")),
            view.progress,
            index == leading_index,
            view.status,
        )
        for index, view in enumerate(views)
    ]
    lead = views[leading_index]
    severities = {"overdue": 3, "due_soon": 2, "on_track": 1, "unknown": 0}
    urgency = max(views, key=lambda view: severities.get(view.urgency, 0)).urgency
    if urgency == "unknown" and any(view.urgency != "unknown" for view in views):
        urgency = max(
            (view for view in views if view.urgency != "unknown"),
            key=lambda view: severities.get(view.urgency, 0),
        ).urgency
    is_due = any(view.is_due for view in views)
    cycle_key = "|".join(view.cycle_key for view in views)
    return MeterResult(
        progress=lead.progress,
        urgency=urgency,
        is_due=is_due,
        done_enabled=True,
        status=lead.status,
        tag=_tag(urgency, lead.status.key),
        rule=_rule(trigger),
        done_effect=_done_effect(trigger),
        meters=meters,
        next_due=lead.next_due,
        cycle_key=cycle_key,
    )


def _evaluate_interval(
    trigger: dict,
    state: dict,
    now: datetime,
    time_zone: str,
    due_soon_days: int,
) -> MeterResult:
    last = _parse_date(state.get("last_performed"))
    every = int(trigger.get("every") or 0)
    unit = str(trigger.get("unit") or "days")
    if last is None or every < 1:
        return _pack(
            trigger,
            progress=100,
            urgency="overdue",
            is_due=True,
            done_enabled=True,
            status=StatusPart("status.overdue_days", {"count": 0}),
            cycle_key="undated",
            meter_id="interval",
        )
    due = _add_interval(last, every, unit)
    return _from_due_date(
        trigger,
        now,
        time_zone,
        due_soon_days,
        last,
        due,
        include_date=False,
        meter_id="interval",
    )


def _evaluate_cycle(trigger: dict, state: dict) -> MeterResult:
    if trigger.get("mode") == "counter" and state.get("reading_missing") and state.get("last_reading") is None:
        return _pack(
            trigger,
            progress=None,
            urgency="unknown",
            is_due=False,
            done_enabled=True,
            status=StatusPart("status.unknown", {}),
            cycle_key=_generation_key(state),
        )
    target = max(1, int(trigger.get("target") or 1))
    count = _num(state.get("count"))
    progress = _round_progress(min(100, (count / target) * 100))
    remaining = max(0, target - count)
    if count >= target:
        status = StatusPart("status.due", {})
        urgency = "overdue"
        is_due = True
    elif remaining <= 1:
        status = StatusPart("status.count_left", {"count": int(remaining) if remaining == int(remaining) else remaining})
        urgency = "due_soon"
        is_due = False
    else:
        status = StatusPart(
            "status.count_of",
            {"count": _display_num(count), "target": target},
        )
        urgency = "on_track"
        is_due = False
    return _pack(
        trigger,
        progress=progress,
        urgency=urgency,
        is_due=is_due,
        done_enabled=True,
        status=status,
        cycle_key=_generation_key(state),
    )


def _evaluate_usage(trigger: dict, state: dict) -> MeterResult:
    if state.get("unit_mismatch"):
        return _pack(
            trigger,
            progress=None,
            urgency="unknown",
            is_due=False,
            done_enabled=True,
            status=StatusPart("status.unknown", {}),
            cycle_key=_generation_key(state),
        )
    if state.get("baseline") is None and state.get("last_sample") is None:
        return _pack(
            trigger,
            progress=None,
            urgency="unknown",
            is_due=False,
            done_enabled=True,
            status=StatusPart("status.waiting_reading", {}),
            cycle_key=_generation_key(state),
        )
    threshold = _num(trigger.get("threshold")) or 1
    amount = _num(state.get("accumulated"))
    progress = _round_progress(min(100, (amount / threshold) * 100))
    remaining_ratio = max(0, threshold - amount) / threshold
    unit = str(trigger.get("unit") or "")
    if amount >= threshold:
        status = StatusPart("status.due", {})
        urgency = "overdue"
        is_due = True
    else:
        status = StatusPart(
            "status.usage_of",
            {"amount": _display_num(amount), "threshold": _display_num(threshold), "unit": unit},
        )
        urgency = "due_soon" if remaining_ratio <= 0.10 else "on_track"
        is_due = False
    return _pack(
        trigger,
        progress=progress,
        urgency=urgency,
        is_due=is_due,
        done_enabled=True,
        status=status,
        cycle_key=_generation_key(state),
    )


def _evaluate_calendar(
    trigger: dict,
    state: dict,
    now: datetime,
    time_zone: str,
    due_soon_days: int,
) -> MeterResult:
    completed = _parse_date(state.get("last_completed_occurrence"))
    today = _as_local(now, time_zone).date()
    try:
        if completed is not None:
            previous = completed
            nxt = _occurrence_after(trigger, previous, time_zone)
        else:
            nxt = _occurrence_after(trigger, today - timedelta(days=1), time_zone)
            previous = _latest_occurrence_on_or_before(
                trigger,
                datetime.combine(today, datetime.min.time()),
                time_zone,
            )
            if previous == today and nxt == today:
                previous = _latest_occurrence_on_or_before(
                    trigger,
                    datetime.combine(today - timedelta(days=1), datetime.min.time()),
                    time_zone,
                )
    except (ZoneInfoNotFoundError, ValueError):
        nxt = None
        previous = None
    if nxt is None or previous is None:
        return _pack(
            trigger,
            progress=None,
            urgency="unknown",
            is_due=False,
            done_enabled=True,
            status=StatusPart("status.unknown", {}),
            cycle_key="calendar",
        )
    return _from_due_date(
        trigger,
        now,
        time_zone,
        due_soon_days,
        previous,
        nxt,
        include_date=True,
        meter_id="calendar",
    )


def _evaluate_idle(
    trigger: dict,
    state: dict,
    now: datetime,
    time_zone: str,
    due_soon_days: int,
) -> MeterResult:
    limit = trigger.get("limit") or {}
    limit_value = _num(limit.get("value")) or 1
    unit = str(limit.get("unit") or "days")
    last_active = _parse_dt(state.get("last_active"))
    if last_active is None:
        return _pack(
            trigger,
            progress=0,
            urgency="on_track",
            is_due=False,
            done_enabled=True,
            status=StatusPart("status.idle_of", {"current": 0, "limit": _display_num(limit_value), "unit": unit}),
            cycle_key=_generation_key(state),
        )
    local_now = _as_local(now, time_zone)
    local_last = _as_local(last_active, time_zone)
    if unit in ("days", "weeks"):
        day_span = (local_now.date() - local_last.date()).days
        current = day_span / 7 if unit == "weeks" else day_span
    else:
        current = _span_in_unit(local_now - local_last, unit)
    progress = _round_progress(min(100, (current / limit_value) * 100))
    if unit == "days":
        days_left = limit_value - current
    else:
        days_left = (limit_value - current) * _unit_days(unit)
    if current >= limit_value:
        status = StatusPart("status.due", {})
        urgency = "overdue"
        is_due = True
    else:
        status = StatusPart(
            "status.idle_of",
            {"current": _display_num(current), "limit": _display_num(limit_value), "unit": unit},
        )
        urgency = "due_soon" if days_left <= due_soon_days else "on_track"
        is_due = False
    return _pack(
        trigger,
        progress=progress,
        urgency=urgency,
        is_due=is_due,
        done_enabled=True,
        status=status,
        cycle_key=_generation_key(state),
    )


def _evaluate_device_life(trigger: dict, state: dict) -> MeterResult:
    if state.get("missing") or state.get("value") is None:
        return _pack(
            trigger,
            progress=None,
            urgency="unknown",
            is_due=False,
            done_enabled=True,
            status=StatusPart("status.life_unknown", {}),
            cycle_key=_generation_key(state),
        )
    value = _num(state.get("value"))
    if trigger.get("scale") == "used":
        life_left = 100 - value
        progress = _round_progress(min(100, max(0, value)))
        status = StatusPart("status.life_used", {"percent": _display_num(value)})
    else:
        life_left = value
        progress = _round_progress(min(100, max(0, 100 - value)))
        status = StatusPart("status.life_left", {"percent": _display_num(value)})
    if life_left <= 0:
        urgency = "overdue"
        is_due = True
        status = StatusPart("status.due", {})
    elif life_left <= 20:
        urgency = "due_soon"
        is_due = False
    else:
        urgency = "on_track"
        is_due = False
    return _pack(
        trigger,
        progress=progress,
        urgency=urgency,
        is_due=is_due,
        done_enabled=True,
        status=status,
        cycle_key=_generation_key(state),
    )


def _evaluate_condition(
    trigger: dict,
    state: dict,
    now: datetime,
    time_zone: str,
) -> MeterResult:
    duration = trigger.get("duration") or {}
    duration_value = _num(duration.get("value")) or 1
    unit = str(duration.get("unit") or "days")
    operator = str(trigger.get("operator") or "gt")
    held = _held_seconds(state, now, time_zone)
    limit_seconds = _unit_seconds(duration_value, unit)
    if state.get("latched") or (limit_seconds > 0 and held >= limit_seconds):
        return _pack(
            trigger,
            progress=100,
            urgency="overdue",
            is_due=True,
            done_enabled=True,
            status=StatusPart("status.due", {}),
            cycle_key=_generation_key(state),
        )
    if not state.get("holding_since") and not _num(state.get("held_seconds")):
        return _pack(
            trigger,
            progress=0,
            urgency="on_track",
            is_due=False,
            done_enabled=False,
            status=StatusPart("status.watching", {}),
            cycle_key=_generation_key(state),
        )
    progress = _round_progress(min(100, (held / limit_seconds) * 100)) if limit_seconds else 0
    elapsed_units = int(held // _unit_seconds(1, unit)) if _unit_seconds(1, unit) else 0
    status_key = {
        "gt": "status.condition_above",
        "gte": "status.condition_above",
        "lt": "status.condition_below",
        "lte": "status.condition_below",
    }.get(operator, "status.condition_held")
    urgency = "due_soon" if progress >= 75 else "on_track"
    return _pack(
        trigger,
        progress=progress,
        urgency=urgency,
        is_due=False,
        done_enabled=True,
        status=StatusPart(
            status_key,
            {
                "elapsed": elapsed_units,
                "duration": _display_num(duration_value),
                "unit": unit,
            },
        ),
        cycle_key=_generation_key(state),
    )


def _evaluate_event(trigger: dict, state: dict) -> MeterResult:
    if state.get("latched"):
        return _pack(
            trigger,
            progress=100,
            urgency="overdue",
            is_due=True,
            done_enabled=True,
            status=StatusPart("status.due", {}),
            cycle_key=str(state.get("latched_at") or _generation_key(state)),
        )
    return _pack(
        trigger,
        progress=0,
        urgency="on_track",
        is_due=False,
        done_enabled=False,
        status=StatusPart("status.watching", {}),
        cycle_key=_generation_key(state),
    )


def _evaluate_after_task(trigger: dict, state: dict) -> MeterResult:
    if state.get("source_missing"):
        count = _num(state.get("count"))
        every = max(1, int(trigger.get("every") or 1))
        progress = _round_progress(min(100, (count / every) * 100))
        return _pack(
            trigger,
            progress=progress,
            urgency="unknown",
            is_due=False,
            done_enabled=True,
            status=StatusPart("status.linked_missing", {}),
            cycle_key=_generation_key(state),
        )
    every = max(1, int(trigger.get("every") or 1))
    count = _num(state.get("count"))
    progress = _round_progress(min(100, (count / every) * 100))
    remaining = max(0, every - count)
    task_id = str(trigger.get("task_id") or "")
    if count >= every:
        status = StatusPart("status.due", {})
        urgency = "overdue"
        is_due = True
    elif remaining <= 1:
        status = StatusPart("status.after_left", {"count": _display_num(remaining), "task_id": task_id})
        urgency = "due_soon"
        is_due = False
    else:
        status = StatusPart(
            "status.after_count",
            {"count": _display_num(count), "every": every, "task_id": task_id},
        )
        urgency = "on_track"
        is_due = False
    return _pack(
        trigger,
        progress=progress,
        urgency=urgency,
        is_due=is_due,
        done_enabled=True,
        status=status,
        cycle_key=_generation_key(state),
    )


def _from_due_date(
    trigger: dict,
    now: datetime,
    time_zone: str,
    due_soon_days: int,
    start: date,
    due: date,
    *,
    include_date: bool,
    meter_id: str,
) -> MeterResult:
    today = _as_local(now, time_zone).date()
    total_days = max(1, (due - start).days)
    elapsed_days = (today - start).days
    progress = _round_progress(min(100, max(0, (elapsed_days / total_days) * 100)))
    days_remaining = (due - today).days
    cycle_key = due.isoformat()
    if days_remaining <= 0:
        overdue_days = abs(days_remaining)
        if overdue_days > MONTH_DAYS:
            status = StatusPart("status.overdue_months", {"count": max(1, round(overdue_days / 30)), "date": due.isoformat()})
        else:
            status = StatusPart("status.overdue_days", {"count": overdue_days})
        return _pack(
            trigger,
            progress=100 if days_remaining <= 0 else progress,
            urgency="overdue",
            is_due=True,
            done_enabled=True,
            status=status,
            next_due=_date_dt(due, time_zone),
            cycle_key=cycle_key,
            meter_id=meter_id,
        )
    if days_remaining <= due_soon_days:
        urgency = "due_soon"
    else:
        urgency = "on_track"
    if days_remaining > MONTH_DAYS:
        status = StatusPart(
            "status.in_months_on_date",
            {"count": max(1, round(days_remaining / 30)), "date": due.isoformat()},
        )
    elif include_date:
        status = StatusPart("status.in_days_on_date", {"count": days_remaining, "date": due.isoformat()})
    else:
        status = StatusPart("status.days_left", {"count": days_remaining})
    return _pack(
        trigger,
        progress=progress,
        urgency=urgency,
        is_due=False,
        done_enabled=True,
        status=status,
        next_due=_date_dt(due, time_zone),
        cycle_key=cycle_key,
        meter_id=meter_id,
    )


def _pack(
    trigger: dict,
    *,
    progress: float | None,
    urgency: str,
    is_due: bool,
    done_enabled: bool,
    status: StatusPart,
    cycle_key: str,
    next_due: datetime | None = None,
    meter_id: str | None = None,
) -> MeterResult:
    if progress is not None and urgency == "overdue":
        progress = 100 if progress >= 100 or is_due else progress
    return MeterResult(
        progress=progress,
        urgency=urgency,
        is_due=is_due,
        done_enabled=done_enabled,
        status=status,
        tag=_tag(urgency, status.key),
        rule=_rule(trigger),
        done_effect=_done_effect(trigger),
        meters=[
            MeterView(meter_id or str(trigger.get("type") or "meter"), progress, True, status)
        ],
        next_due=next_due,
        cycle_key=cycle_key,
    )


def _tag(urgency: str, status_key: str) -> StatusPart | None:
    if urgency == "due_soon" and status_key != "status.due":
        return StatusPart("tag.due_soon", {})
    if urgency == "overdue" and status_key not in {
        "status.due",
        "status.overdue_days",
        "status.overdue_months",
    }:
        return StatusPart("tag.overdue", {})
    return None


def _rule(trigger: dict) -> StatusPart:
    kind = trigger.get("type")
    if kind == "interval":
        return StatusPart("rule.interval", {"count": trigger.get("every") or 0, "unit": trigger.get("unit") or "days"})
    if kind == "cycle":
        if trigger.get("mode") == "manual" or not trigger.get("entity_id"):
            return StatusPart("rule.cycle_manual", {"count": trigger.get("target") or 0})
        return StatusPart(
            "rule.cycle",
            {"count": trigger.get("target") or 0, "entity_id": trigger.get("entity_id") or ""},
        )
    if kind == "usage":
        return StatusPart(
            "rule.usage",
            {
                "threshold": trigger.get("threshold") or 0,
                "unit": trigger.get("unit") or "",
                "entity_id": trigger.get("entity_id") or "",
            },
        )
    if kind == "calendar":
        if trigger.get("rule") in CALENDAR_PRESETS:
            return StatusPart("rule.calendar_preset", {"preset": trigger.get("rule") or ""})
        if trigger.get("repeat") == "month":
            return StatusPart("rule.calendar_monthly", {"day": trigger.get("day") or 1})
        return StatusPart(
            "rule.calendar_yearly",
            {"month": trigger.get("month") or 1, "day": trigger.get("day") or 1},
        )
    if kind == "idle":
        limit = trigger.get("limit") or {}
        return StatusPart(
            "rule.idle",
            {
                "limit": limit.get("value") or 0,
                "unit": limit.get("unit") or "days",
                "entity_id": trigger.get("entity_id") or "",
            },
        )
    if kind == "device_life":
        return StatusPart("rule.device_life", {"entity_id": trigger.get("entity_id") or ""})
    if kind == "condition":
        duration = trigger.get("duration") or {}
        return StatusPart(
            "rule.condition",
            {
                "operator": trigger.get("operator") or "",
                "threshold": trigger.get("threshold") if trigger.get("threshold") is not None else "",
                "duration": duration.get("value") or 0,
                "unit": duration.get("unit") or "days",
                "entity_id": trigger.get("entity_id") or "",
            },
        )
    if kind == "event":
        if trigger.get("source") == "event":
            return StatusPart("rule.event_bus", {"event_type": trigger.get("event_type") or ""})
        return StatusPart(
            "rule.event_state",
            {"entity_id": trigger.get("entity_id") or "", "to_state": trigger.get("to_state") or ""},
        )
    if kind == "after_task":
        return StatusPart(
            "rule.after_task",
            {"every": trigger.get("every") or 0, "task_id": trigger.get("task_id") or ""},
        )
    if kind == "either":
        return StatusPart("rule.either", {})
    return StatusPart("rule.unknown", {})


def _done_effect(trigger: dict) -> StatusPart:
    kind = trigger.get("type")
    if kind == "interval":
        return StatusPart("done.interval", {})
    if kind == "cycle":
        return StatusPart("done.cycle", {"target": trigger.get("target") or 0})
    if kind == "either":
        return StatusPart("done.either", {})
    if kind == "usage":
        return StatusPart(
            "done.usage",
            {"threshold": trigger.get("threshold") or 0, "unit": trigger.get("unit") or ""},
        )
    if kind == "calendar":
        return StatusPart("done.calendar", {})
    if kind == "idle":
        return StatusPart("done.idle", {})
    if kind == "device_life":
        if trigger.get("reset_entity_id"):
            return StatusPart("done.device_life_reset", {"entity_id": trigger.get("reset_entity_id") or ""})
        return StatusPart("done.device_life", {})
    if kind == "condition":
        return StatusPart("done.condition", {})
    if kind == "event":
        return StatusPart("done.event", {})
    if kind == "after_task":
        return StatusPart("done.after_task", {})
    return StatusPart("done.unknown", {})


def _observe_cycle(trigger: dict, state: dict, observation: dict) -> None:
    mode = trigger.get("mode")
    if mode == "manual":
        return
    if observation.get("kind") not in ("state", "startup"):
        return
    entity_state = observation.get("state")
    if entity_state in (None, "unavailable", "unknown"):
        return
    if mode == "counter":
        attribute = trigger.get("attribute")
        raw = _parse_number((observation.get("attributes") or {}).get(attribute))
        if raw is None:
            if state.get("last_reading") is None:
                state["reading_missing"] = True
            return
        state["reading_missing"] = False
        value = raw
        last = state.get("last_reading")
        if last is None:
            state["last_reading"] = value
            return
        last_value = float(last)
        if value >= last_value:
            state["count"] = _num(state.get("count")) + (value - last_value)
        else:
            state["count"] = _num(state.get("count")) + value
        state["last_reading"] = value
        return
    running_state = str(trigger.get("running_state") or "on")
    running = str(entity_state).lower() == running_state.lower()
    at = _coerce_dt(observation.get("at"))
    started = _parse_dt(state.get("run_started_at"))
    minimum = _duration_td(trigger.get("minimum") or {"value": 0, "unit": "seconds"})
    if running:
        if started is None and observation.get("kind") != "startup":
            state["run_started_at"] = at.isoformat()
        elif started is None and observation.get("kind") == "startup":
            state["run_started_at"] = at.isoformat()
        return
    if started is None:
        return
    if at - started >= minimum:
        state["count"] = _num(state.get("count")) + 1
    state["run_started_at"] = None


def _observe_usage(trigger: dict, state: dict, observation: dict) -> None:
    if observation.get("kind") not in ("state", "startup"):
        return
    if observation.get("state") in (None, "unavailable", "unknown"):
        return
    raw = observation.get("value")
    if raw is None:
        raw = observation.get("state")
    value = _parse_number(raw)
    if value is None:
        return
    unit = observation.get("unit")
    if state.get("unit_at_bind") is None and unit:
        state["unit_at_bind"] = unit
    elif unit and state.get("unit_at_bind") and unit != state.get("unit_at_bind"):
        state["unit_mismatch"] = True
        return
    if state.get("unit_mismatch"):
        return
    last = state.get("last_sample")
    if state.get("baseline") is None or last is None:
        state["baseline"] = value
        state["last_sample"] = value
        state["accumulated"] = 0
        return
    last_value = float(last)
    accumulated = _num(state.get("accumulated"))
    if value >= last_value:
        accumulated += value - last_value
    else:
        accumulated += value
    state["accumulated"] = accumulated
    state["last_sample"] = value


def _observe_idle(trigger: dict, state: dict, observation: dict, time_zone: str) -> None:
    if observation.get("kind") not in ("state", "startup"):
        return
    entity_state = observation.get("state")
    if entity_state in (None, "unavailable", "unknown"):
        return
    at = _coerce_dt(observation.get("at"))
    running_state = str(trigger.get("running_state") or "on")
    if str(entity_state).lower() == running_state.lower() or state.get("last_active") is None:
        state["last_active"] = _as_local(at, time_zone).isoformat()


def _observe_device_life(trigger: dict, state: dict, observation: dict) -> None:
    if observation.get("kind") not in ("state", "startup"):
        return
    if observation.get("state") in (None, "unavailable", "unknown"):
        state["missing"] = True
        return
    reading = trigger.get("reading") or "state"
    if reading == "state":
        raw = observation.get("state")
    else:
        raw = (observation.get("attributes") or {}).get(reading)
    value = _parse_number(raw)
    if value is None:
        state["missing"] = True
        return
    state["missing"] = False
    state["value"] = value


def _observe_condition(trigger: dict, state: dict, observation: dict, time_zone: str) -> None:
    if observation.get("kind") not in ("state", "startup"):
        return
    at = _as_local(_coerce_dt(observation.get("at")), time_zone)
    entity_state = observation.get("state")
    if entity_state in (None, "unavailable", "unknown"):
        if state.get("holding_since") and not state.get("paused"):
            started = _parse_dt(state.get("holding_since"))
            if started is not None:
                elapsed = at - _as_local(started, time_zone)
                state["held_seconds"] = _num(state.get("held_seconds")) + max(0, elapsed.total_seconds())
            state["holding_since"] = None
            state["paused"] = True
        return
    raw = entity_state
    attribute = trigger.get("attribute")
    if attribute:
        raw = (observation.get("attributes") or {}).get(attribute, raw)
    if not _matches(raw, trigger.get("operator"), trigger.get("threshold")):
        state["holding_since"] = None
        state["held_seconds"] = 0
        state["latched"] = False
        state["paused"] = False
        return
    if state.get("paused") or not state.get("holding_since"):
        state["paused"] = False
        state["holding_since"] = at.isoformat()
    duration = trigger.get("duration") or {}
    if _held_seconds(state, at, time_zone) >= _unit_seconds(_num(duration.get("value") or 1), str(duration.get("unit") or "days")):
        state["latched"] = True


def _observe_event(trigger: dict, state: dict, observation: dict, time_zone: str) -> None:
    if state.get("latched"):
        return
    at = _as_local(_coerce_dt(observation.get("at")), time_zone)
    if trigger.get("source") == "event":
        if observation.get("kind") != "event":
            return
        if observation.get("event_type") != trigger.get("event_type"):
            return
        if not _data_matches(observation.get("data"), trigger.get("data")):
            return
        state["latched"] = True
        state["latched_at"] = at.isoformat()
        return
    if observation.get("kind") == "startup":
        return
    if observation.get("kind") != "state":
        return
    entity_state = observation.get("state")
    old_state = observation.get("old_state")
    if entity_state in (None, "unavailable", "unknown") or old_state is None:
        return
    if str(old_state) == str(entity_state):
        return
    if str(entity_state).lower() == str(trigger.get("to_state") or "").lower():
        state["latched"] = True
        state["latched_at"] = at.isoformat()


def _observe_after_task(trigger: dict, state: dict, observation: dict) -> None:
    if observation.get("kind") == "source_missing":
        state["source_missing"] = True
        return
    if observation.get("kind") != "source_completed":
        return
    if observation.get("source_task_id") != trigger.get("task_id"):
        return
    if state.get("source_missing"):
        return
    state["count"] = _num(state.get("count")) + 1


def _meter_watches(trigger: dict, observation: dict) -> bool:
    kind = observation.get("kind")
    if kind in ("state", "startup"):
        return trigger.get("entity_id") == observation.get("entity_id")
    if kind == "event":
        return trigger.get("type") == "event" and trigger.get("event_type") == observation.get("event_type")
    if kind == "source_completed":
        return trigger.get("type") == "after_task" and trigger.get("task_id") == observation.get("source_task_id")
    return False


def _validate_calendar(trigger: dict) -> list[str]:
    rule = trigger.get("rule")
    if rule == "month_day":
        month = trigger.get("month")
        day = trigger.get("day")
        repeat = trigger.get("repeat")
        errors = []
        if repeat not in ("year", "month"):
            errors.append("trigger.errors.repeat")
        if repeat == "year" and (not isinstance(month, int) or not 1 <= month <= 12):
            errors.append("trigger.errors.month")
        if not isinstance(day, int) or not 1 <= day <= 31:
            errors.append("trigger.errors.day")
        return errors
    if rule not in CALENDAR_PRESETS:
        return ["trigger.errors.calendar"]
    return []


def _validate_event(trigger: dict) -> list[str]:
    source = trigger.get("source")
    if source == "state":
        errors = []
        if not trigger.get("entity_id"):
            errors.append("trigger.errors.entity")
        if trigger.get("to_state") in (None, ""):
            errors.append("trigger.errors.to_state")
        return errors
    if source == "event":
        event_type = trigger.get("event_type")
        if not event_type or event_type in REJECTED_EVENTS:
            return ["trigger.errors.event_type"]
        data = trigger.get("data") or {}
        if not isinstance(data, dict) or len(data) > 5:
            return ["trigger.errors.event_data"]
        return []
    return ["trigger.errors.event_source"]


def _matches(raw: object, operator: object, threshold: object) -> bool:
    value = _parse_number(raw)
    target = _parse_number(threshold)
    if value is not None and target is not None:
        return {
            "gt": value > target,
            "gte": value >= target,
            "lt": value < target,
            "lte": value <= target,
            "eq": value == target,
            "neq": value != target,
        }.get(str(operator), False)
    text = str(raw)
    target_text = str(threshold)
    if operator == "eq":
        return text == target_text
    if operator == "neq":
        return text != target_text
    return False


def _data_matches(payload: object, expected: object) -> bool:
    if not expected:
        return True
    if not isinstance(expected, dict) or not isinstance(payload, dict):
        return False
    return all(payload.get(key) == value for key, value in expected.items())


def _held_seconds(state: dict, now: datetime, time_zone: str) -> float:
    total = _num(state.get("held_seconds"))
    started = _parse_dt(state.get("holding_since"))
    if started is None or state.get("paused"):
        return total
    elapsed = _as_local(now, time_zone) - _as_local(started, time_zone)
    return total + max(0, elapsed.total_seconds())


def _add_interval(start: date, value: int, unit: str) -> date:
    if unit == "weeks":
        return start + timedelta(weeks=value)
    if unit == "months":
        return start + relativedelta(months=value)
    return start + timedelta(days=value)


def _occurrence_after(trigger: dict, day: date, time_zone: str) -> date | None:
    """First occurrence strictly after ``day``."""
    cursor = day
    for _ in range(24):
        nxt = _next_occurrence_on_or_after(trigger, cursor + timedelta(days=1), time_zone)
        if nxt is None:
            return None
        if nxt > day:
            return nxt
        cursor = nxt
    return None


def _latest_occurrence_on_or_before(trigger: dict, moment: datetime, time_zone: str) -> date | None:
    day = _as_local(moment, time_zone).date()
    nxt = _next_occurrence_on_or_after(trigger, day - timedelta(days=400), time_zone)
    latest: date | None = None
    guard = 0
    while nxt is not None and nxt <= day and guard < 24:
        latest = nxt
        nxt = _occurrence_after(trigger, nxt, time_zone)
        guard += 1
    return latest


def _next_occurrence_on_or_after(trigger: dict, day: date, time_zone: str) -> date | None:
    rule = trigger.get("rule")
    if rule in ("dst_forward", "dst_back"):
        forward = rule == "dst_forward"
        for year in (day.year, day.year + 1):
            for found in _dst_dates(year, time_zone, forward):
                if found >= day:
                    return found
        return None
    if rule in SEASONS_NORTH:
        month, season_day = _season_month_day(str(rule), trigger.get("hemisphere"))
        return _yearly_on_or_after(day, month, season_day)
    if rule == "month_day" and trigger.get("repeat") == "month":
        return _monthly_on_or_after(day, int(trigger.get("day") or 1))
    if rule == "month_day":
        return _yearly_on_or_after(day, int(trigger.get("month") or 1), int(trigger.get("day") or 1))
    return None


def _season_month_day(rule: str, hemisphere: object) -> tuple[int, int]:
    table = SEASONS_SOUTH if hemisphere == "south" else SEASONS_NORTH
    return table[rule]


def _yearly_on_or_after(day: date, month: int, month_day: int) -> date:
    candidate = _clamp_date(day.year, month, month_day)
    if candidate < day:
        candidate = _clamp_date(day.year + 1, month, month_day)
    return candidate


def _monthly_on_or_after(day: date, month_day: int) -> date:
    candidate = _clamp_date(day.year, day.month, month_day)
    if candidate < day:
        nxt = day + relativedelta(months=1)
        candidate = _clamp_date(nxt.year, nxt.month, month_day)
    return candidate


def _clamp_date(year: int, month: int, month_day: int) -> date:
    from calendar import monthrange

    return date(year, month, min(month_day, monthrange(year, month)[1]))


def _dst_dates(year: int, time_zone: str, forward: bool) -> list[date]:
    from calendar import monthrange

    zone = ZoneInfo(time_zone or "UTC")
    found: list[date] = []
    previous = datetime(year, 1, 1, 4, tzinfo=zone).utcoffset()
    for month in range(1, 13):
        for day_number in range(1, monthrange(year, month)[1] + 1):
            offset = datetime(year, month, day_number, 12, tzinfo=zone).utcoffset()
            if offset != previous and (offset > previous) == forward:
                found.append(date(year, month, day_number))
            previous = offset
    return found


def _as_local(value: datetime, time_zone: str) -> datetime:
    try:
        zone = ZoneInfo(time_zone or "UTC")
    except ZoneInfoNotFoundError:
        zone = timezone.utc
    if value.tzinfo is None:
        return value.replace(tzinfo=zone)
    return value.astimezone(zone)


def _date_dt(day: date, time_zone: str) -> datetime:
    try:
        zone = ZoneInfo(time_zone or "UTC")
    except ZoneInfoNotFoundError:
        zone = timezone.utc
    return datetime(day.year, day.month, day.day, tzinfo=zone)


def _parse_date(value: object) -> date | None:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if not isinstance(value, str) or len(value) < 10:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def _parse_dt(value: object) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if not isinstance(value, str) or not value:
        return None
    text = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        parsed = _parse_date(text)
        if parsed is None:
            return None
        return datetime(parsed.year, parsed.month, parsed.day)
    return None


def _coerce_dt(value: object) -> datetime:
    parsed = _parse_dt(value)
    if parsed is None:
        return datetime.now(timezone.utc)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def _duration_td(spec: dict) -> timedelta:
    return timedelta(seconds=_unit_seconds(_num(spec.get("value")), str(spec.get("unit") or "seconds")))


def _unit_seconds(value: float, unit: str) -> float:
    multipliers = {
        "seconds": 1,
        "minutes": 60,
        "hours": 3600,
        "days": 86400,
        "weeks": 604800,
    }
    return value * multipliers.get(unit, 86400)


def _unit_days(unit: str) -> float:
    return {"hours": 1 / 24, "minutes": 1 / 1440, "weeks": 7, "days": 1}.get(unit, 1)


def _span_in_unit(delta: timedelta, unit: str) -> float:
    seconds = max(0, delta.total_seconds())
    return seconds / _unit_seconds(1, unit)


def _generation_key(state: dict) -> str:
    return f"gen-{int(state.get('generation') or 0)}"


def _days_var(result: MeterResult) -> int:
    count = result.status.vars.get("count")
    if result.status.key in {"status.days_left", "status.in_days_on_date", "status.overdue_days"} and isinstance(count, int):
        if result.status.key == "status.overdue_days":
            return -count
        return count
    return 0


def _round_progress(value: float) -> float:
    return round(min(100, max(0, value)), 1)


def _num(value: object) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return 0
    return float(value)


def _display_num(value: float) -> int | float:
    if float(value).is_integer():
        return int(value)
    return round(float(value), 1)


def _parse_number(value: object) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.strip())
        except ValueError:
            return None
    return None


def _is_number(value: object) -> bool:
    return _parse_number(value) is not None
