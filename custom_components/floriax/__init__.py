"""FloriaX Home Assistant integration."""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigEntryState
from homeassistant.core import HomeAssistant, ServiceCall, ServiceResponse, SupportsResponse
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.typing import ConfigType

from .api import FloriaXApiError, FloriaXClient
from .api_spec import OPERATIONS
from .const import CONF_API_BASE_URL, CONF_API_TOKEN, CONF_ORG_ID, DOMAIN, SERVICE_REQUEST


def _client_for_call(hass: HomeAssistant, call: ServiceCall) -> FloriaXClient:
    entry_id = call.data.get("config_entry_id")
    entries = [entry for entry in hass.config_entries.async_entries(DOMAIN) if entry.state is ConfigEntryState.LOADED]
    if entry_id:
        entry = hass.config_entries.async_get_entry(str(entry_id))
        if entry is None or entry.domain != DOMAIN:
            raise ServiceValidationError("FloriaX config entry not found")
        if entry.state is not ConfigEntryState.LOADED:
            raise ServiceValidationError("FloriaX config entry is not loaded")
    else:
        if not entries:
            raise ServiceValidationError("No loaded FloriaX config entry found")
        if len(entries) > 1:
            raise ServiceValidationError("Multiple FloriaX entries exist; provide config_entry_id")
        entry = entries[0]
    client = hass.data.get(DOMAIN, {}).get(entry.entry_id)
    if client is None:
        raise ServiceValidationError("FloriaX client is unavailable")
    return client


def _dict_or_empty(value: Any, field: str) -> dict[str, Any]:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ServiceValidationError(f"{field} must be an object/dictionary")
    return value


async def _execute(
    hass: HomeAssistant,
    call: ServiceCall,
    method: str,
    path: str,
    fixed_path_params: list[str] | None = None,
) -> ServiceResponse | None:
    client = _client_for_call(hass, call)
    data = dict(call.data)
    data.pop("config_entry_id", None)
    path_parameters = _dict_or_empty(data.pop("path_parameters", None), "path_parameters")
    query = _dict_or_empty(data.pop("query", None), "query")
    body = data.pop("body", None)
    for api_name in fixed_path_params or []:
        if api_name == "orgId":
            continue
        snake_name = "".join(("_" + c.lower() if c.isupper() else c) for c in api_name).lstrip("_")
        if snake_name in data:
            path_parameters[api_name] = data.pop(snake_name)
    if data:
        raise ServiceValidationError(f"Unknown action fields: {', '.join(sorted(data))}")
    try:
        result = await client.request(method, path, path_parameters=path_parameters, query=query, body=body)
    except FloriaXApiError as err:
        raise ServiceValidationError(str(err)) from err
    return result if call.return_response else None


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register all FloriaX actions independent of config entry loading."""

    async def raw_request(call: ServiceCall) -> ServiceResponse | None:
        method = str(call.data.get("method", "GET")).upper()
        path = str(call.data.get("path", ""))
        if not path.startswith("/"):
            raise ServiceValidationError("path must start with /")
        copied = ServiceCall(call.domain, call.service, {k: v for k, v in call.data.items() if k not in {"method", "path"}}, call.context, call.return_response)
        return await _execute(hass, copied, method, path)

    hass.services.async_register(
        DOMAIN,
        SERVICE_REQUEST,
        raw_request,
        schema=vol.Schema({
            vol.Optional("config_entry_id"): str,
            vol.Required("method"): vol.In(["GET", "POST", "PUT", "PATCH", "DELETE"]),
            vol.Required("path"): str,
            vol.Optional("path_parameters"): dict,
            vol.Optional("query"): dict,
            vol.Optional("body"): object,
        }),
        supports_response=SupportsResponse.OPTIONAL,
    )

    for service_name, operation in OPERATIONS.items():
        async def generated(call: ServiceCall, op: dict[str, Any] = operation) -> ServiceResponse | None:
            return await _execute(hass, call, op["method"], op["path"], op["path_params"])
        schema_dict: dict[Any, Any] = {
            vol.Optional("config_entry_id"): str,
            vol.Optional("query"): dict,
            vol.Optional("body"): object,
        }
        for api_name in operation["path_params"]:
            if api_name == "orgId":
                continue
            snake_name = "".join(("_" + c.lower() if c.isupper() else c) for c in api_name).lstrip("_")
            schema_dict[vol.Required(snake_name)] = object
        hass.services.async_register(
            DOMAIN,
            service_name,
            generated,
            schema=vol.Schema(schema_dict),
            supports_response=SupportsResponse.OPTIONAL,
        )
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up a configured FloriaX instance."""
    session = async_get_clientsession(hass)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = FloriaXClient(
        session,
        entry.data[CONF_API_BASE_URL],
        entry.data[CONF_API_TOKEN],
        entry.data[CONF_ORG_ID],
    )
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a FloriaX instance."""
    hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)
    return True
