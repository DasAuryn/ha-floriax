"""Binary sensors for the FloriaX integration."""
from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorDeviceClass, BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DATA_ENTRIES, DOMAIN
from .coordinator import FloriaXRuntimeData
from .data import record_is_active
from .entity import FloriaXCoordinatorEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up FloriaX binary sensors."""
    runtime: FloriaXRuntimeData = hass.data[DOMAIN][DATA_ENTRIES][entry.entry_id]
    async_add_entities(
        (
            FloriaXConnectionBinarySensor(runtime.coordinator, entry),
            FloriaXAlarmBinarySensor(runtime.coordinator, entry),
            FloriaXDegradedBinarySensor(runtime.coordinator, entry),
        )
    )


class FloriaXConnectionBinarySensor(FloriaXCoordinatorEntity, BinarySensorEntity):
    """Whether the FloriaX organization is reachable."""

    _attr_name = "API-Verbindung"
    _attr_device_class = BinarySensorDeviceClass.CONNECTIVITY
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, coordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_api_connection"

    @property
    def is_on(self) -> bool:
        return bool(self.coordinator.last_update_success)


class FloriaXAlarmBinarySensor(FloriaXCoordinatorEntity, BinarySensorEntity):
    """Whether at least one alarm event appears active."""

    _attr_name = "Aktiver Alarm"
    _attr_device_class = BinarySensorDeviceClass.PROBLEM
    _attr_icon = "mdi:alarm-light"

    def __init__(self, coordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_active_alarm"

    @property
    def is_on(self) -> bool:
        resource = ((self.coordinator.data or {}).get("resources") or {}).get("alarm_events") or {}
        return any(record_is_active(item) for item in resource.get("items") or [])


class FloriaXDegradedBinarySensor(FloriaXCoordinatorEntity, BinarySensorEntity):
    """Whether some API sections are unavailable."""

    _attr_name = "API teilweise eingeschränkt"
    _attr_device_class = BinarySensorDeviceClass.PROBLEM
    _attr_entity_category = EntityCategory.DIAGNOSTIC
    _attr_icon = "mdi:cloud-alert-outline"

    def __init__(self, coordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_degraded"

    @property
    def is_on(self) -> bool:
        return bool((self.coordinator.data or {}).get("errors"))

    @property
    def extra_state_attributes(self):
        return {"errors": (self.coordinator.data or {}).get("errors") or {}}
