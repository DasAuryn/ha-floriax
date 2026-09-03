"""WebSocket API used by the FloriaX Home Assistant web application."""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.components.websocket_api import ActiveConnection
from homeassistant.core import HomeAssistant

from .api import FloriaXApiError
from .api_spec import OPERATIONS
from .const import DATA_ENTRIES, DATA_WEBSOCKET_REGISTERED, DOMAIN, VERSION
from .coordinator import FloriaXRuntimeData


def _loaded_entries(hass: HomeAssistant) -> dict[str, FloriaXRuntimeData]:
    return hass.data.get(DOMAIN, {}).get(DATA_ENTRIES, {})


def _get_runtime(
    hass: HomeAssistant,
    entry_id: str | None,
) -> tuple[str, FloriaXRuntimeData] | None:
    entries = _loaded_entries(hass)
    if entry_id:
        runtime = entries.get(entry_id)
        return (entry_id, runtime) if runtime else None
    if not entries:
        return None
    selected = next(iter(entries))
    return selected, entries[selected]


def _entry_catalog(hass: HomeAssistant) -> list[dict[str, Any]]:
    catalog: list[dict[str, Any]] = []
    for entry_id in _loaded_entries(hass):
        entry = hass.config_entries.async_get_entry(entry_id)
        if entry is None:
            continue
        catalog.append(
            {
                "entry_id": entry.entry_id,
                "title": entry.title,
                "organization_id": entry.data.get("org_id"),
                "api_base_url": entry.data.get("api_base_url"),
            }
        )
    return catalog


def _operation_catalog() -> list[dict[str, Any]]:
    return [
        {
            "service": service,
            "method": operation["method"],
            "path": operation["path"],
            "summary": operation["summary"],
            "tags": operation["tags"],
            "path_params": operation["path_params"],
            "requires_admin": operation["method"] != "GET",
        }
        for service, operation in OPERATIONS.items()
    ]


def _send_api_error(connection: ActiveConnection, msg_id: int, err: FloriaXApiError) -> None:
    code = "floriax_error"
    if err.status == 401:
        code = "invalid_auth"
    elif err.status == 403:
        code = "forbidden"
    connection.send_error(msg_id, code, str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "floriax/dashboard/get",
        vol.Optional("entry_id"): str,
        vol.Optional("refresh", default=False): bool,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_dashboard_get(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return the complete dashboard snapshot without exposing credentials."""
    selected = _get_runtime(hass, msg.get("entry_id"))
    entries = _entry_catalog(hass)
    if selected is None:
        connection.send_result(
            msg["id"],
            {
                "version": VERSION,
                "entries": entries,
                "selected_entry_id": None,
                "is_admin": connection.user.is_admin,
                "can_trigger_quick_actions": connection.user.is_admin,
                "snapshot": None,
                "operations": _operation_catalog(),
            },
        )
        return

    entry_id, runtime = selected
    if msg.get("refresh"):
        await runtime.coordinator.async_request_refresh()

    entry = hass.config_entries.async_get_entry(entry_id)
    connection.send_result(
        msg["id"],
        {
            "version": VERSION,
            "entries": entries,
            "selected_entry_id": entry_id,
            "selected_entry": {
                "entry_id": entry_id,
                "title": entry.title if entry else "FloriaX",
                "organization_id": entry.data.get("org_id") if entry else None,
                "api_base_url": entry.data.get("api_base_url") if entry else None,
            },
            "is_admin": connection.user.is_admin,
            "can_trigger_quick_actions": connection.user.is_admin,
            "last_update_success": runtime.coordinator.last_update_success,
            "snapshot": runtime.coordinator.data,
            "operations": _operation_catalog(),
        },
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "floriax/dashboard/request",
        vol.Optional("entry_id"): str,
        vol.Required("method"): vol.In(["GET", "POST", "PUT", "PATCH", "DELETE"]),
        vol.Required("path"): str,
        vol.Optional("path_parameters"): dict,
        vol.Optional("query"): dict,
        vol.Optional("body"): object,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_dashboard_request(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Proxy a request from the web app through the protected HA backend."""
    selected = _get_runtime(hass, msg.get("entry_id"))
    if selected is None:
        connection.send_error(msg["id"], "not_found", "No loaded FloriaX configuration found")
        return

    method = msg["method"].upper()
    path = msg["path"]
    if not path.startswith("/"):
        connection.send_error(msg["id"], "invalid_format", "Path must start with /")
        return
    if method != "GET" and not connection.user.is_admin:
        connection.send_error(
            msg["id"],
            "unauthorized",
            "Administrator permission is required for write operations",
        )
        return

    _, runtime = selected
    try:
        result = await runtime.coordinator.async_execute(
            method,
            path,
            path_parameters=msg.get("path_parameters"),
            query=msg.get("query"),
            body=msg.get("body"),
        )
    except FloriaXApiError as err:
        _send_api_error(connection, msg["id"], err)
        return
    connection.send_result(msg["id"], result)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "floriax/dashboard/quick_action",
        vol.Optional("entry_id"): str,
        vol.Required("action_id"): vol.Any(str, int),
        vol.Optional("body"): object,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_quick_action(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Trigger a known GroupLead quick action for an administrator."""
    selected = _get_runtime(hass, msg.get("entry_id"))
    if selected is None:
        connection.send_error(msg["id"], "not_found", "No loaded FloriaX configuration found")
        return

    _, runtime = selected
    try:
        result = await runtime.coordinator.async_execute(
            "POST",
            "/organizations/{orgId}/grouplead/quick-actions/{actionId}/trigger",
            path_parameters={"actionId": msg["action_id"]},
            body=msg.get("body"),
        )
    except FloriaXApiError as err:
        _send_api_error(connection, msg["id"], err)
        return
    connection.send_result(msg["id"], result)


def async_register_websocket_api(hass: HomeAssistant) -> None:
    """Register FloriaX WebSocket commands once."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    if domain_data.get(DATA_WEBSOCKET_REGISTERED):
        return
    websocket_api.async_register_command(hass, websocket_dashboard_get)
    websocket_api.async_register_command(hass, websocket_dashboard_request)
    websocket_api.async_register_command(hass, websocket_quick_action)
    domain_data[DATA_WEBSOCKET_REGISTERED] = True
