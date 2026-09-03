"""Sensors for the FloriaX integration."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorEntityDescription
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from .const import DATA_ENTRIES, DOMAIN
from .coordinator import FloriaXRuntimeData
from .data import record_is_active, resource_count
from .entity import FloriaXCoordinatorEntity


@dataclass(frozen=True, kw_only=True)
class FloriaXSensorDescription(SensorEntityDescription):
    """Describe a FloriaX summary sensor."""

    resource_key: str | None = None
    active_only: bool = False


SENSOR_DESCRIPTIONS: tuple[FloriaXSensorDescription, ...] = (
    FloriaXSensorDescription(key="gateways", name="Gateways", icon="mdi:access-point-network", resource_key="gateways"),
    FloriaXSensorDescription(key="buttons", name="Buttons", icon="mdi:radiobox-marked", resource_key="buttons"),
    FloriaXSensorDescription(
        key="environment_sensors",
        name="Umweltsensoren",
        icon="mdi:thermometer-lines",
        resource_key="environment_sensors",
    ),
    FloriaXSensorDescription(
        key="alarm_events",
        name="Alarm-Ereignisse",
        icon="mdi:alarm-light",
        resource_key="alarm_events",
    ),
    FloriaXSensorDescription(
        key="active_alarm_events",
        name="Aktive Alarm-Ereignisse",
        icon="mdi:alarm-light",
        resource_key="alarm_events",
        active_only=True,
    ),
    FloriaXSensorDescription(
        key="mqtt_connections",
        name="MQTT-Verbindungen",
        icon="mdi:connection",
        resource_key="mqtt_connections",
    ),
    FloriaXSensorDescription(
        key="time_tracking_sessions",
        name="Zeiterfassungs-Sessions",
        icon="mdi:timer-outline",
        resource_key="time_tracking_sessions",
    ),
    FloriaXSensorDescription(
        key="grouplead_people",
        name="GroupLead Personen",
        icon="mdi:account-group-outline",
        resource_key="grouplead_people",
    ),
    FloriaXSensorDescription(
        key="grouplead_vehicles",
        name="GroupLead Fahrzeuge",
        icon="mdi:fire-truck",
        resource_key="grouplead_vehicles",
    ),
    FloriaXSensorDescription(
        key="grouplead_teams",
        name="GroupLead Teams",
        icon="mdi:account-multiple-outline",
        resource_key="grouplead_teams",
    ),
    FloriaXSensorDescription(
        key="grouplead_quick_actions",
        name="Schnellaktionen",
        icon="mdi:lightning-bolt-circle",
        resource_key="grouplead_quick_actions",
    ),
    FloriaXSensorDescription(
        key="grouplead_incidents",
        name="GroupLead Einsätze",
        icon="mdi:clipboard-text-clock-outline",
        resource_key="grouplead_incidents",
    ),
    FloriaXSensorDescription(
        key="unavailable_resources",
        name="Nicht verfügbare API-Bereiche",
        icon="mdi:cloud-alert-outline",
        entity_category=EntityCategory.DIAGNOSTIC,
    ),
    FloriaXSensorDescription(
        key="last_synchronization",
        name="Letzte Synchronisierung",
        icon="mdi:sync-clock",
        device_class=SensorDeviceClass.TIMESTAMP,
        entity_category=EntityCategory.DIAGNOSTIC,
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up FloriaX summary sensors."""
    runtime: FloriaXRuntimeData = hass.data[DOMAIN][DATA_ENTRIES][entry.entry_id]
    async_add_entities(
        FloriaXSummarySensor(runtime.coordinator, entry, description)
        for description in SENSOR_DESCRIPTIONS
    )


class FloriaXSummarySensor(FloriaXCoordinatorEntity, SensorEntity):
    """A summary sensor backed by the complete dashboard snapshot."""

    entity_description: FloriaXSensorDescription

    def __init__(
        self,
        coordinator,
        entry: ConfigEntry,
        description: FloriaXSensorDescription,
    ) -> None:
        super().__init__(coordinator, entry)
        self.entity_description = description
        self._attr_unique_id = f"{entry.entry_id}_{description.key}"

    @property
    def native_value(self) -> int | datetime | None:
        """Return the current sensor value."""
        data = self.coordinator.data or {}
        if self.entity_description.key == "unavailable_resources":
            return len(data.get("errors") or {})
        if self.entity_description.key == "last_synchronization":
            value = data.get("fetched_at")
            if not value:
                return None
            parsed = dt_util.parse_datetime(value)
            return parsed

        resources: dict[str, dict[str, Any]] = data.get("resources") or {}
        resource = resources.get(self.entity_description.resource_key or "")
        if self.entity_description.active_only:
            return sum(1 for item in (resource or {}).get("items") or [] if record_is_active(item))
        return resource_count(resource)

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        """Expose compact diagnostic attributes."""
        data = self.coordinator.data or {}
        if self.entity_description.key == "unavailable_resources":
            return {
                "successful_resources": data.get("successful_resources", 0),
                "total_resources": data.get("total_resources", 0),
                "errors": data.get("errors") or {},
            }
        resource_key = self.entity_description.resource_key
        if not resource_key:
            return None
        resource = (data.get("resources") or {}).get(resource_key) or {}
        return {
            "api_status": resource.get("status"),
            "http_status": resource.get("http_status"),
            "resource_title": resource.get("title"),
        }
