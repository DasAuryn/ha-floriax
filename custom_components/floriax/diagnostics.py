"""Diagnostics for FloriaX."""
from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.redact import async_redact_data

from .const import CONF_API_TOKEN, DATA_ENTRIES, DOMAIN
from .coordinator import FloriaXRuntimeData

TO_REDACT = {CONF_API_TOKEN}


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> dict[str, Any]:
    """Return credential-safe diagnostics."""
    runtime: FloriaXRuntimeData | None = hass.data.get(DOMAIN, {}).get(DATA_ENTRIES, {}).get(
        entry.entry_id
    )
    snapshot = runtime.coordinator.data if runtime else None
    return {
        "entry": async_redact_data(dict(entry.data), TO_REDACT),
        "last_update_success": runtime.coordinator.last_update_success if runtime else False,
        "snapshot_summary": {
            "fetched_at": snapshot.get("fetched_at") if snapshot else None,
            "successful_resources": snapshot.get("successful_resources") if snapshot else 0,
            "total_resources": snapshot.get("total_resources") if snapshot else 0,
            "errors": snapshot.get("errors") if snapshot else {},
            "counts": {
                key: value.get("count", 0)
                for key, value in (snapshot.get("resources") or {}).items()
            }
            if snapshot
            else {},
        },
    }
