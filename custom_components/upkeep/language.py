"""Language codes shared by Upkeep UI catalogs and notices."""

from __future__ import annotations

from typing import Any

SUPPORTED_LANGUAGES = ("ca", "de", "en", "es", "fr", "it", "nl", "pt")
DEFAULT_LANGUAGE = "en"


def normalize_language(language: str | None) -> str | None:
    """Return a supported language code, or None when the value is unknown."""
    if not isinstance(language, str) or not language.strip():
        return None
    code = language.replace("-", "_").split("_", 1)[0].lower()
    return code if code in SUPPORTED_LANGUAGES else None


def configured_language(
    config_entry: Any | None,
    hass_language: str | None = None,
) -> str:
    """Resolve the Upkeep language from the entry, then Home Assistant, then English."""
    if config_entry is not None:
        options = getattr(config_entry, "options", None) or {}
        data = getattr(config_entry, "data", None) or {}
        chosen = normalize_language(options.get("language", data.get("language")))
        if chosen:
            return chosen
    return normalize_language(hass_language) or DEFAULT_LANGUAGE
