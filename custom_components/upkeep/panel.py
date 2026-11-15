"""Support for Upkeep custom panel."""

import logging
from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import (
    ICONS_API_URL,
    ICONS_FILENAME,
    PANEL_API_PATH,
    PANEL_API_URL,
    PANEL_FILENAME,
    PANEL_ICON_FALLBACK,
    PANEL_NAME,
    PANEL_TITLE,
    PANEL_URL,
    sidebar_icon as resolve_sidebar_icon,
)

_LOGGER = logging.getLogger(__name__)


async def async_register_panel(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Register custom panel for Upkeep."""
    panel_file = Path(__file__).parent / PANEL_FILENAME
    if not panel_file.is_file():
        _LOGGER.error(
            "Upkeep sidebar panel not registered: missing %s. "
            "Reinstall from the latest HACS release or ensure panel/dist/main.js exists, "
            "then reload the integration.",
            panel_file,
        )
        return

    static_path = panel_file.parent

    if not hass.data.setdefault("upkeep_static_path_registered", False):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(PANEL_API_PATH, str(static_path), cache_headers=False)]
        )
        hass.data["upkeep_static_path_registered"] = True

    admin_only = entry.options.get("admin_only", entry.data.get("admin_only", False))
    sidebar_title = entry.options.get(
        "sidebar_title", entry.data.get("sidebar_title", PANEL_TITLE)
    )
    sidebar_icon = resolve_sidebar_icon(entry)

    icons_file = Path(__file__).parent / ICONS_FILENAME
    if icons_file.is_file():
        if not hass.data.setdefault("upkeep_icons_registered", False):
            frontend.add_extra_js_url(hass, ICONS_API_URL)
            hass.data["upkeep_icons_registered"] = True
    elif sidebar_icon.startswith("upkeep:"):
        _LOGGER.warning(
            "Upkeep icon set missing (%s); using %s in the sidebar",
            icons_file,
            PANEL_ICON_FALLBACK,
        )
        sidebar_icon = PANEL_ICON_FALLBACK

    await panel_custom.async_register_panel(
        hass,
        webcomponent_name=PANEL_NAME,
        frontend_url_path=PANEL_URL,
        module_url=PANEL_API_URL,
        sidebar_title=sidebar_title,
        sidebar_icon=sidebar_icon,
        require_admin=admin_only,
        config={},
    )


def async_unregister_panel(hass: HomeAssistant) -> None:
    """Remove custom panel for Upkeep."""
    frontend.async_remove_panel(hass, PANEL_URL)
    if hass.data.pop("upkeep_icons_registered", False):
        frontend.remove_extra_js_url(hass, ICONS_API_URL)
    _LOGGER.debug("Removing panel")
