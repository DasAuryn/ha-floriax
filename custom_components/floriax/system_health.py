"""System health for FloriaX."""
from __future__ import annotations

from homeassistant.components import system_health
from homeassistant.core import HomeAssistant, callback

from .const import CONF_API_BASE_URL, DATA_ENTRIES, DOMAIN


@callback
def async_register(
    hass: HomeAssistant,
    register: system_health.SystemHealthRegistration,
) -> None:
    register.async_register_info(system_health_info)


async def system_health_info(hass: HomeAssistant) -> dict:
    """Return FloriaX connectivity information."""
    entries = hass.config_entries.async_entries(DOMAIN)
    runtimes = hass.data.get(DOMAIN, {}).get(DATA_ENTRIES, {})
    if not entries:
        return {"configured_instances": 0}
    return {
        "configured_instances": len(entries),
        "loaded_instances": len(runtimes),
        "can_reach_server": system_health.async_check_can_reach_url(
            hass, entries[0].data[CONF_API_BASE_URL]
        ),
    }
