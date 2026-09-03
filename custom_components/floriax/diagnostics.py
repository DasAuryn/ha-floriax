"""Diagnostics for FloriaX."""
from __future__ import annotations
from typing import Any
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.redact import async_redact_data
from .const import CONF_API_TOKEN

TO_REDACT = {CONF_API_TOKEN}

async def async_get_config_entry_diagnostics(hass: HomeAssistant, entry: ConfigEntry) -> dict[str, Any]:
    return {"entry": async_redact_data(dict(entry.data), TO_REDACT)}
