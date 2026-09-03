"""Constants for the FloriaX integration."""
from __future__ import annotations

from typing import Final

DOMAIN: Final = "floriax"
NAME: Final = "FloriaX"
MANUFACTURER: Final = "Smart PSA GmbH"
VERSION: Final = "2.0.0"

CONF_API_BASE_URL: Final = "api_base_url"
CONF_ORG_ID: Final = "org_id"
CONF_API_TOKEN: Final = "api_token"
CONF_SCAN_INTERVAL: Final = "scan_interval"

DEFAULT_TIMEOUT: Final = 30
DEFAULT_SCAN_INTERVAL: Final = 30
MIN_SCAN_INTERVAL: Final = 15
MAX_SCAN_INTERVAL: Final = 3600

SERVICE_REQUEST: Final = "request"

DATA_ENTRIES: Final = "entries"
DATA_PANEL_REGISTERED: Final = "panel_registered"
DATA_WEBSOCKET_REGISTERED: Final = "websocket_registered"
DATA_SERVICES_REGISTERED: Final = "services_registered"

PANEL_URL: Final = "floriax"
PANEL_COMPONENT: Final = "floriax-panel"
PANEL_TITLE: Final = "FloriaX"
PANEL_ICON: Final = "mdi:shield-home"
PANEL_STATIC_URL: Final = "/floriax_static"
