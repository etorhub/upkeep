"""Constants for the Upkeep integration."""

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers import config_validation as cv

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
PANEL_TITLE = NAME
PANEL_ICON = "mdi:hammer-wrench"
PANEL_NAME = "upkeep-panel"

DEVICE_KEY = "upkeep_hub"

# Event fired when a task becomes due
EVENT_TASK_DUE = "upkeep_task_due"

# Coordinator poll interval (for due-date checks and event firing)
COORDINATOR_UPDATE_INTERVAL = 300  # 5 minutes

# Services
SERVICE_COMPLETE_TASK = "complete_task"
SERVICE_RESET_LAST_PERFORMED = "reset_last_performed"  # Alias for backward compat
SERVICE_INCREMENT_COUNTER = "increment_counter"
SERVICE_SNOOZE_TASK = "snooze_task"
SERVICE_ENABLE_TASK = "enable_task"

SERVICE_COMPLETE_TASK_SCHEMA = vol.Schema(
    {
        vol.Required("entity_id"): cv.entity_id,
        vol.Optional("performed_date"): cv.string,
    }
)

SERVICE_INCREMENT_COUNTER_SCHEMA = vol.Schema(
    {
        vol.Required("entity_id"): cv.entity_id,
    }
)

SERVICE_SNOOZE_TASK_SCHEMA = vol.Schema(
    {
        vol.Required("entity_id"): cv.entity_id,
        vol.Optional("snooze_until"): cv.string,
        vol.Optional("disable"): cv.boolean,
    }
)

SERVICE_ENABLE_TASK_SCHEMA = vol.Schema(
    {
        vol.Required("entity_id"): cv.entity_id,
    }
)

CONFIG_STEP_USER_DATA_SCHEMA = vol.Schema(
    {
        vol.Optional("admin_only", default=False): cv.boolean,
        vol.Optional("sidebar_title", default=PANEL_TITLE): cv.string,
        vol.Optional("sidebar_icon", default=PANEL_ICON): cv.string,
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
                default=config_entry.options.get(
                    "sidebar_icon",
                    config_entry.data.get("sidebar_icon", PANEL_ICON),
                ),
            ): cv.string,
        }
    )
