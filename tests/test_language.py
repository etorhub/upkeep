"""Tests for the Upkeep language setting."""

import importlib.util
import sys
from pathlib import Path
from types import SimpleNamespace

_SPEC = importlib.util.spec_from_file_location(
    "upkeep_language",
    Path(__file__).resolve().parents[1] / "custom_components" / "upkeep" / "language.py",
)
assert _SPEC is not None and _SPEC.loader is not None
_LANGUAGE = importlib.util.module_from_spec(_SPEC)
sys.modules[_SPEC.name] = _LANGUAGE
_SPEC.loader.exec_module(_LANGUAGE)

configured_language = _LANGUAGE.configured_language
normalize_language = _LANGUAGE.normalize_language


def test_configured_language_prefers_entry_option() -> None:
    entry = SimpleNamespace(options={"language": "ca"}, data={"language": "en"})
    assert configured_language(entry, "de") == "ca"


def test_configured_language_falls_back_to_entry_data() -> None:
    entry = SimpleNamespace(options={}, data={"language": "fr"})
    assert configured_language(entry, "de") == "fr"


def test_configured_language_falls_back_to_home_assistant() -> None:
    entry = SimpleNamespace(options={}, data={})
    assert configured_language(entry, "nl-NL") == "nl"
    assert configured_language(None, "pt") == "pt"


def test_configured_language_rejects_unknown_codes() -> None:
    entry = SimpleNamespace(options={"language": "zz"}, data={})
    assert configured_language(entry, "zz") == "en"
    assert normalize_language("en-GB") == "en"
    assert normalize_language("Catalan") is None
