"""Task mutation schemas and the service descriptions agents read."""

import importlib.util
import sys
from pathlib import Path

import pytest
import voluptuous as vol
import yaml

_ROOT = Path(__file__).resolve().parents[1]
_SPEC = importlib.util.spec_from_file_location(
    "upkeep_schemas",
    _ROOT / "custom_components" / "upkeep" / "schemas.py",
)
assert _SPEC is not None and _SPEC.loader is not None
_SCHEMAS = importlib.util.module_from_spec(_SPEC)
sys.modules[_SPEC.name] = _SCHEMAS
_SPEC.loader.exec_module(_SCHEMAS)

CREATE_TASK_SCHEMA = _SCHEMAS.CREATE_TASK_SCHEMA
TASK_REF_SCHEMA = _SCHEMAS.TASK_REF_SCHEMA
TASK_UPDATE_SCHEMA = _SCHEMAS.TASK_UPDATE_SCHEMA

_PANEL_ADD = {
    "title": "HVAC filter",
    "description": "Replace it",
    "icon": "mdi:air-filter",
    "interval_value": 90,
    "interval_type": "days",
    "notify_before": False,
    "notify_when_due": True,
}

_PANEL_EDIT = {
    "title": "HVAC filter",
    "description": None,
    "icon": "mdi:air-filter",
    "notify_before": True,
    "notify_when_due": False,
    "notify_before_value": 7,
    "notify_before_unit": "days",
    "interval_value": 90,
    "interval_type": "days",
}


def test_create_schema_requires_title() -> None:
    with pytest.raises(vol.MultipleInvalid):
        CREATE_TASK_SCHEMA({})


def test_create_schema_accepts_panel_add_payload() -> None:
    parsed = CREATE_TASK_SCHEMA(_PANEL_ADD)

    assert parsed["title"] == "HVAC filter"
    assert parsed["interval_value"] == 90
    assert parsed["task_type"] == "time"
    assert parsed["labels"] == []


def test_update_schema_accepts_panel_edit_payload() -> None:
    parsed = TASK_UPDATE_SCHEMA(_PANEL_EDIT)

    assert parsed["description"] is None
    assert parsed["interval_type"] == "days"


def test_update_schema_rejects_unknown_key() -> None:
    with pytest.raises(vol.MultipleInvalid):
        TASK_UPDATE_SCHEMA({**_PANEL_EDIT, "not_a_field": True})


def test_identifier_schema_requires_one_id() -> None:
    with pytest.raises(vol.MultipleInvalid):
        TASK_REF_SCHEMA({})

    assert TASK_REF_SCHEMA({"entity_id": "binary_sensor.hvac_filter"})["entity_id"]
    assert TASK_REF_SCHEMA({"task_id": "upkeep_abc"})["task_id"]


def test_services_yaml_documents_task_crud() -> None:
    document = yaml.safe_load(
        (_ROOT / "custom_components" / "upkeep" / "services.yaml").read_text(
            encoding="utf-8"
        )
    )

    add_task = document["add_task"]
    assert "task_id" in add_task["description"]
    assert "entity_id" in add_task["description"]

    for name in ("update_task", "remove_task"):
        fields = document[name]["fields"]
        assert "entity_id" in fields
        assert "task_id" in fields
