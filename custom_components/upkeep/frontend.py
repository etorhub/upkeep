"""Frontend (Lovelace card) registration."""

import json
import logging
from pathlib import Path

from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_call_later

from .const import CARD_URL_BASE, LEGACY_CARD_URL_BASE

_LOGGER = logging.getLogger(__name__)

CARD_FILENAME = "upkeep-card.js"


def _get_version() -> str:
    """Read version from manifest."""
    manifest_path = Path(__file__).parent / "manifest.json"
    try:
        with open(manifest_path, encoding="utf-8") as f:
            return json.load(f).get("version", "1.0.0")
    except Exception:
        return "1.0.0"


async def async_register_card(hass: HomeAssistant) -> None:
    """Register the Lovelace card static path and optionally add to resources."""
    www_path = Path(__file__).parent / "www"
    if not (www_path / CARD_FILENAME).exists():
        _LOGGER.warning("Card file not found at %s", www_path / CARD_FILENAME)
        return

    try:
        await hass.http.async_register_static_paths(
            [StaticPathConfig(CARD_URL_BASE, www_path, cache_headers=False)]
        )
        _LOGGER.debug("Card path registered: %s -> %s", CARD_URL_BASE, www_path)
    except RuntimeError:
        _LOGGER.debug("Card path already registered: %s", CARD_URL_BASE)

    lovelace = hass.data.get("lovelace")
    if lovelace is None:
        return
    mode = getattr(lovelace, "mode", getattr(lovelace, "resource_mode", "yaml"))
    if mode != "storage":
        return

    async def _add_resource(_=None):
        if lovelace is None:
            return
        resources = getattr(lovelace, "resources", None)
        if resources is None:
            return
        if not getattr(resources, "loaded", True):
            async_call_later(hass, 5, _add_resource)
            return
        url = f"{CARD_URL_BASE}/{CARD_FILENAME}"
        legacy_url = f"{LEGACY_CARD_URL_BASE}/{CARD_FILENAME}"
        version = await hass.async_add_executor_job(_get_version)
        full_url = f"{url}?v={version}"
        items = getattr(resources, "async_items", lambda: [])()
        existing = [
            r
            for r in items
            if r.get("url", "").startswith(url)
            or r.get("url", "").startswith(legacy_url)
        ]
        if existing:
            for r in existing:
                if r.get("url") != full_url:
                    try:
                        await resources.async_update_item(
                            r["id"], {"res_type": "module", "url": full_url}
                        )
                        _LOGGER.info("Updated Upkeep Card to v%s", version)
                    except Exception:
                        pass
            return
        try:
            await resources.async_create_item(
                {"res_type": "module", "url": full_url}
            )
            _LOGGER.info("Registered Upkeep Card v%s", version)
        except Exception as e:
            _LOGGER.warning("Could not register card: %s", e)

    await _add_resource()
