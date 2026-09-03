"""Base entity classes for FloriaX."""
from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import CONF_API_BASE_URL, CONF_ORG_ID, DOMAIN, MANUFACTURER, NAME
from .coordinator import FloriaXCoordinator


class FloriaXCoordinatorEntity(CoordinatorEntity[FloriaXCoordinator]):
    """Base coordinator entity for one FloriaX organization."""

    _attr_has_entity_name = True

    def __init__(self, coordinator: FloriaXCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self.entry = entry
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            manufacturer=MANUFACTURER,
            model="FloriaX Cloud",
            name=f"{NAME} · Organisation {entry.data[CONF_ORG_ID]}",
            configuration_url=entry.data[CONF_API_BASE_URL],
        )
