"""Constants for the Upkeep integration."""

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.selector import TimeSelector

from .schemas import (
    ADD_TASK_SERVICE_SCHEMA,
    COMPLETE_TASK_SCHEMA,
    ENABLE_TASK_SCHEMA,
    INCREMENT_COUNTER_SCHEMA,
    REMOVE_TASK_SCHEMA,
    SNOOZE_TASK_SCHEMA,
    UPDATE_TASK_SERVICE_SCHEMA,
)

VERSION = "1.0.0"
NAME = "Upkeep"
MANUFACTURER = "@etorhub"

DOMAIN = "upkeep"

TASK_TYPE_TIME = "time"
TASK_TYPE_FREQUENCY = "frequency"

INTERVAL_TYPES = ["days", "weeks", "months"]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

PANEL_FILENAME = "panel/dist/main.js"
PANEL_URL = "upkeep"
# Lovelace card static mount; must not match /{PANEL_URL} (panel frontend route).
CARD_URL_BASE = "/upkeep_lovelace"
LEGACY_CARD_URL_BASE = "/upkeep"
PANEL_API_PATH = "/upkeep_static"
PANEL_API_URL = PANEL_API_PATH + "/main.js"
# Registers the "upkeep:" icon set so the sidebar can show the brand mark. It is
# loaded on every Home Assistant page, because the sidebar renders before the
# panel module is ever requested.
ICONS_FILENAME = "panel/dist/upkeep-icons.js"
ICONS_API_URL = PANEL_API_PATH + "/upkeep-icons.js"
PANEL_TITLE = NAME
PANEL_ICON = "upkeep:logo"
# Fallback when the brand icon set is not available.
PANEL_ICON_FALLBACK = "mdi:home-roof"
# Default shipped before the brand mark. Entries that still store it never
# picked an icon themselves, so they move to the new default.
LEGACY_PANEL_ICON = "mdi:hammer-wrench"
PANEL_NAME = "upkeep-panel"

DEVICE_KEY = "upkeep_hub"

# Event fired when a task becomes due
EVENT_TASK_DUE = "upkeep_task_due"

# Event fired when a task is completed, from the panel, a service or an NFC tag
EVENT_TASK_COMPLETED = "upkeep_task_completed"

# Coordinator poll interval (for due-date checks and event firing)
COORDINATOR_UPDATE_INTERVAL = 300  # 5 minutes

# Local time when upcoming and due notices are sent.
DEFAULT_NOTIFY_TIME = "08:00"

# Services
SERVICE_ADD_TASK = "add_task"
SERVICE_UPDATE_TASK = "update_task"
SERVICE_REMOVE_TASK = "remove_task"
SERVICE_COMPLETE_TASK = "complete_task"
SERVICE_RESET_LAST_PERFORMED = "reset_last_performed"  # Alias for backward compat
SERVICE_INCREMENT_COUNTER = "increment_counter"
SERVICE_SNOOZE_TASK = "snooze_task"
SERVICE_ENABLE_TASK = "enable_task"

SERVICE_ADD_TASK_SCHEMA = ADD_TASK_SERVICE_SCHEMA
SERVICE_UPDATE_TASK_SCHEMA = UPDATE_TASK_SERVICE_SCHEMA
SERVICE_REMOVE_TASK_SCHEMA = REMOVE_TASK_SCHEMA
SERVICE_COMPLETE_TASK_SCHEMA = COMPLETE_TASK_SCHEMA
SERVICE_INCREMENT_COUNTER_SCHEMA = INCREMENT_COUNTER_SCHEMA
SERVICE_SNOOZE_TASK_SCHEMA = SNOOZE_TASK_SCHEMA
SERVICE_ENABLE_TASK_SCHEMA = ENABLE_TASK_SCHEMA

CONFIG_STEP_USER_DATA_SCHEMA = vol.Schema(
    {
        vol.Optional("admin_only", default=False): cv.boolean,
        vol.Optional("sidebar_title", default=PANEL_TITLE): cv.string,
        vol.Optional("sidebar_icon", default=PANEL_ICON): cv.string,
        vol.Optional("notify_time", default=DEFAULT_NOTIFY_TIME): TimeSelector(),
    }
)


def get_options_schema(config_entry: ConfigEntry) -> vol.Schema:
    """Return the schema for options flow."""
    return vol.Schema(
        {
            vol.Optional(
                "admin_only",
                default=config_entry.options.get(
                    "admin_only", config_entry.data.get("admin_only", False)
                ),
            ): cv.boolean,
            vol.Optional(
                "sidebar_title",
                default=config_entry.options.get(
                    "sidebar_title",
                    config_entry.data.get("sidebar_title", PANEL_TITLE),
                ),
            ): cv.string,
            vol.Optional(
                "sidebar_icon",
                default=sidebar_icon(config_entry),
            ): cv.string,
            vol.Optional(
                "notify_time",
                default=config_entry.options.get(
                    "notify_time",
                    config_entry.data.get("notify_time", DEFAULT_NOTIFY_TIME),
                ),
            ): TimeSelector(),
        }
    )


def sidebar_icon(config_entry) -> str:
    """Return the sidebar icon chosen for an entry, upgrading the legacy default."""
    icon = config_entry.options.get(
        "sidebar_icon", config_entry.data.get("sidebar_icon", PANEL_ICON)
    )
    return PANEL_ICON if icon == LEGACY_PANEL_ICON else icon
