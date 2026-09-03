"""System health for FloriaX."""
from __future__ import annotations
from homeassistant.components import system_health
from homeassistant.core import HomeAssistant, callback
from .const import CONF_API_BASE_URL, DOMAIN

@callback
def async_register(hass: HomeAssistant, register: system_health.SystemHealthRegistration) -> None:
    register.async_register_info(system_health_info)

async def system_health_info(hass: HomeAssistant) -> dict:
    entries = hass.config_entries.async_entries(DOMAIN)
    if not entries:
        return {"configured_instances": 0}
    return {
        "configured_instances": len(entries),
        "can_reach_server": system_health.async_check_can_reach_url(hass, entries[0].data[CONF_API_BASE_URL]),
    }
