"""Dashboard resource definitions and response helpers for FloriaX."""
from __future__ import annotations

from collections.abc import Iterable
from typing import Any, Final

DASHBOARD_RESOURCES: Final[tuple[dict[str, Any], ...]] = (
    {
        "key": "gateways",
        "title": "Gateways",
        "icon": "mdi:access-point-network",
        "section": "infrastructure",
        "path": "/organizations/{orgId}/gateways",
        "kind": "collection",
    },
    {
        "key": "gateway_groups",
        "title": "Gateway-Gruppen",
        "icon": "mdi:access-point-network-off",
        "section": "infrastructure",
        "path": "/organizations/{orgId}/gateway-groups",
        "kind": "collection",
    },
    {
        "key": "buttons",
        "title": "Buttons",
        "icon": "mdi:radiobox-marked",
        "section": "infrastructure",
        "path": "/organizations/{orgId}/buttons",
        "kind": "collection",
    },
    {
        "key": "environment_sensors",
        "title": "Umweltsensoren",
        "icon": "mdi:thermometer-lines",
        "section": "sensors",
        "path": "/organizations/{orgId}/environment-sensors",
        "kind": "collection",
    },
    {
        "key": "things_entities",
        "title": "Things-Entitäten",
        "icon": "mdi:cube-outline",
        "section": "sensors",
        "path": "/organizations/{orgId}/things/entities",
        "kind": "collection",
    },
    {
        "key": "alarm_settings",
        "title": "Alarm-Einstellungen",
        "icon": "mdi:alarm-light-outline",
        "section": "alarms",
        "path": "/organizations/{orgId}/alarms/settings",
        "kind": "object",
    },
    {
        "key": "alarm_targets",
        "title": "Alarm-Ziele",
        "icon": "mdi:account-multiple-check-outline",
        "section": "alarms",
        "path": "/organizations/{orgId}/alarms/targets",
        "kind": "collection",
    },
    {
        "key": "alarm_events",
        "title": "Alarm-Ereignisse",
        "icon": "mdi:alarm-light",
        "section": "alarms",
        "path": "/organizations/{orgId}/alarms/events",
        "kind": "collection",
    },
    {
        "key": "mqtt_connections",
        "title": "MQTT-Verbindungen",
        "icon": "mdi:connection",
        "section": "mqtt",
        "path": "/organizations/{orgId}/mqtt-connections",
        "kind": "collection",
    },
    {
        "key": "hosted_mqtt_broker",
        "title": "Hosted MQTT Broker",
        "icon": "mdi:server-network",
        "section": "mqtt",
        "path": "/organizations/{orgId}/hosted-mqtt-broker",
        "kind": "object",
    },
    {
        "key": "hosted_mqtt_users",
        "title": "Hosted MQTT Benutzer",
        "icon": "mdi:account-key-outline",
        "section": "mqtt",
        "path": "/organizations/{orgId}/hosted-mqtt-broker/users",
        "kind": "collection",
    },
    {
        "key": "time_tracking_sessions",
        "title": "Zeiterfassungs-Sessions",
        "icon": "mdi:timer-outline",
        "section": "time_tracking",
        "path": "/organizations/{orgId}/time-tracking/sessions",
        "kind": "collection",
    },
    {
        "key": "time_tracking_incidents",
        "title": "Zeiterfassungs-Einsätze",
        "icon": "mdi:fire-truck",
        "section": "time_tracking",
        "path": "/organizations/{orgId}/time-tracking/incidents",
        "kind": "collection",
    },
    {
        "key": "grouplead_people",
        "title": "Personen",
        "icon": "mdi:account-group-outline",
        "section": "grouplead",
        "path": "/organizations/{orgId}/grouplead/people",
        "kind": "collection",
    },
    {
        "key": "grouplead_tags",
        "title": "Tags",
        "icon": "mdi:tag-multiple-outline",
        "section": "grouplead",
        "path": "/organizations/{orgId}/grouplead/tags",
        "kind": "collection",
    },
    {
        "key": "grouplead_vehicles",
        "title": "Fahrzeuge",
        "icon": "mdi:fire-truck",
        "section": "grouplead",
        "path": "/organizations/{orgId}/grouplead/vehicles",
        "kind": "collection",
    },
    {
        "key": "grouplead_teams",
        "title": "Teams",
        "icon": "mdi:account-multiple-outline",
        "section": "grouplead",
        "path": "/organizations/{orgId}/grouplead/teams",
        "kind": "collection",
    },
    {
        "key": "grouplead_map_objects",
        "title": "Kartenobjekte",
        "icon": "mdi:map-marker-multiple-outline",
        "section": "grouplead",
        "path": "/organizations/{orgId}/grouplead/map-objects",
        "kind": "collection",
    },
    {
        "key": "grouplead_quick_actions",
        "title": "Schnellaktionen",
        "icon": "mdi:lightning-bolt-circle",
        "section": "grouplead",
        "path": "/organizations/{orgId}/grouplead/quick-actions",
        "kind": "collection",
    },
    {
        "key": "grouplead_incidents",
        "title": "GroupLead-Einsätze",
        "icon": "mdi:clipboard-text-clock-outline",
        "section": "grouplead",
        "path": "/organizations/{orgId}/grouplead/incidents",
        "kind": "collection",
    },
    {
        "key": "grouplead_changes",
        "title": "GroupLead-Änderungen",
        "icon": "mdi:sync-circle",
        "section": "grouplead",
        "path": "/organizations/{orgId}/grouplead/changes",
        "kind": "collection",
    },
)

COLLECTION_KEYS: Final[tuple[str, ...]] = (
    "items",
    "data",
    "results",
    "records",
    "entries",
    "entities",
    "gateways",
    "gatewayGroups",
    "gateway_groups",
    "buttons",
    "sensors",
    "events",
    "targets",
    "connections",
    "users",
    "sessions",
    "incidents",
    "people",
    "tags",
    "vehicles",
    "teams",
    "mapObjects",
    "map_objects",
    "quickActions",
    "quick_actions",
    "changes",
)

IDENTIFIER_KEYS: Final[tuple[str, ...]] = (
    "id",
    "rowId",
    "row_id",
    "recordId",
    "record_id",
    "gatewayId",
    "gateway_id",
    "buttonId",
    "button_id",
    "sensorId",
    "sensor_id",
    "eventId",
    "event_id",
    "connectionId",
    "connection_id",
    "incidentId",
    "incident_id",
    "personRecordId",
    "person_record_id",
    "tagId",
    "tag_id",
    "vehicleId",
    "vehicle_id",
    "teamRowId",
    "team_row_id",
    "mapObjectRowId",
    "map_object_row_id",
    "actionId",
    "action_id",
    "groupLeadIncidentId",
    "group_lead_incident_id",
)

NAME_KEYS: Final[tuple[str, ...]] = (
    "name",
    "title",
    "label",
    "displayName",
    "display_name",
    "description",
    "room",
    "location",
    "callsign",
    "callSign",
    "eventName",
    "event_name",
    "username",
    "mac",
    "uuid",
)

INACTIVE_STATES: Final[frozenset[str]] = frozenset(
    {
        "archived",
        "closed",
        "resolved",
        "completed",
        "complete",
        "finished",
        "ended",
        "inactive",
        "disabled",
        "offline",
        "disconnected",
        "false",
        "0",
    }
)

ACTIVE_STATES: Final[frozenset[str]] = frozenset(
    {
        "active",
        "open",
        "new",
        "ongoing",
        "running",
        "triggered",
        "alarm",
        "online",
        "connected",
        "enabled",
        "true",
        "1",
    }
)


def extract_items(payload: Any) -> list[Any]:
    """Extract a list from common API response envelope shapes."""
    if payload is None:
        return []
    if isinstance(payload, list):
        return payload
    if isinstance(payload, tuple):
        return list(payload)
    if isinstance(payload, dict):
        for key in COLLECTION_KEYS:
            value = payload.get(key)
            if isinstance(value, list):
                return value
        for value in payload.values():
            if isinstance(value, list):
                return value
    return []


def extract_identifier(item: Any, preferred: Iterable[str] | None = None) -> str | None:
    """Extract a stable identifier from a FloriaX object."""
    if not isinstance(item, dict):
        return None
    for key in tuple(preferred or ()) + IDENTIFIER_KEYS:
        value = item.get(key)
        if value not in (None, ""):
            return str(value)
    return None


def extract_name(item: Any, fallback: str = "FloriaX") -> str:
    """Extract a human-readable name from a FloriaX object."""
    if not isinstance(item, dict):
        return str(item) if item not in (None, "") else fallback
    for key in NAME_KEYS:
        value = item.get(key)
        if value not in (None, ""):
            return str(value)
    identifier = extract_identifier(item)
    return f"{fallback} {identifier}" if identifier else fallback


def record_is_active(item: Any) -> bool:
    """Best-effort active-state detection for heterogeneous API objects."""
    if not isinstance(item, dict):
        return False
    for key in ("archived", "isArchived", "is_archived", "closed", "resolved"):
        if item.get(key) is True:
            return False
    for key in ("active", "isActive", "is_active", "online", "connected", "enabled"):
        if key in item and isinstance(item[key], bool):
            return bool(item[key])
    for key in ("status", "state", "connectionStatus", "connection_status"):
        if key not in item or item[key] in (None, ""):
            continue
        value = str(item[key]).strip().lower()
        if value in INACTIVE_STATES:
            return False
        if value in ACTIVE_STATES:
            return True
    return True


def resource_count(resource: dict[str, Any] | None) -> int:
    """Return the visible record count for a dashboard resource."""
    if not resource or resource.get("status") != "ok":
        return 0
    value = resource.get("count")
    if isinstance(value, int):
        return value
    return len(resource.get("items") or [])
