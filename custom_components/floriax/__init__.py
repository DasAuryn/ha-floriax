"""FloriaX Home Assistant integration."""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigEntryState
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall, ServiceResponse, SupportsResponse
from homeassistant.exceptions import ConfigEntryAuthFailed, ConfigEntryNotReady, ServiceValidationError
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.typing import ConfigType

from .api import (
    FloriaXApiError,
    FloriaXAuthenticationError,
    FloriaXClient,
    FloriaXConnectionError,
)
from .api_spec import OPERATIONS
from .const import (
    CONF_API_BASE_URL,
    CONF_API_TOKEN,
    CONF_ORG_ID,
    DATA_ENTRIES,
    DATA_SERVICES_REGISTERED,
    DOMAIN,
    SERVICE_REQUEST,
)
from .coordinator import FloriaXCoordinator, FloriaXRuntimeData
from .panel import async_setup_panel
from .websocket import async_register_websocket_api

PLATFORMS: list[Platform] = [Platform.SENSOR, Platform.BINARY_SENSOR, Platform.BUTTON]


def _runtime_for_call(hass: HomeAssistant, data: dict[str, Any]) -> FloriaXRuntimeData:
    entry_id = data.get("config_entry_id")
    loaded_entries = {
        entry.entry_id: entry
        for entry in hass.config_entries.async_entries(DOMAIN)
        if entry.state is ConfigEntryState.LOADED
    }
    if entry_id:
        entry = loaded_entries.get(str(entry_id))
        if entry is None:
            raise ServiceValidationError("FloriaX config entry not found or not loaded")
    else:
        if not loaded_entries:
            raise ServiceValidationError("No loaded FloriaX config entry found")
        if len(loaded_entries) > 1:
            raise ServiceValidationError("Multiple FloriaX entries exist; provide config_entry_id")
        entry = next(iter(loaded_entries.values()))

    runtime = hass.data.get(DOMAIN, {}).get(DATA_ENTRIES, {}).get(entry.entry_id)
    if runtime is None:
        raise ServiceValidationError("FloriaX runtime is unavailable")
    return runtime


def _dict_or_empty(value: Any, field: str) -> dict[str, Any]:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ServiceValidationError(f"{field} must be an object/dictionary")
    return value


async def _execute_data(
    hass: HomeAssistant,
    call_data: dict[str, Any],
    return_response: bool,
    method: str,
    path: str,
    fixed_path_params: list[str] | None = None,
) -> ServiceResponse | None:
    runtime = _runtime_for_call(hass, call_data)
    data = dict(call_data)
    data.pop("config_entry_id", None)
    path_parameters = _dict_or_empty(data.pop("path_parameters", None), "path_parameters")
    query = _dict_or_empty(data.pop("query", None), "query")
    body = data.pop("body", None)
    for api_name in fixed_path_params or []:
        if api_name == "orgId":
            continue
        snake_name = "".join(
            ("_" + char.lower() if char.isupper() else char) for char in api_name
        ).lstrip("_")
        if snake_name in data:
            path_parameters[api_name] = data.pop(snake_name)
    if data:
        raise ServiceValidationError(f"Unknown action fields: {', '.join(sorted(data))}")
    try:
        result = await runtime.coordinator.async_execute(
            method,
            path,
            path_parameters=path_parameters,
            query=query,
            body=body,
        )
    except FloriaXApiError as err:
        raise ServiceValidationError(str(err)) from err
    return result if return_response else None


async def _execute(
    hass: HomeAssistant,
    call: ServiceCall,
    method: str,
    path: str,
    fixed_path_params: list[str] | None = None,
) -> ServiceResponse | None:
    return await _execute_data(
        hass,
        dict(call.data),
        call.return_response,
        method,
        path,
        fixed_path_params,
    )


def _register_services(hass: HomeAssistant) -> None:
    domain_data = hass.data.setdefault(DOMAIN, {})
    if domain_data.get(DATA_SERVICES_REGISTERED):
        return

    async def raw_request(call: ServiceCall) -> ServiceResponse | None:
        method = str(call.data.get("method", "GET")).upper()
        path = str(call.data.get("path", ""))
        if not path.startswith("/"):
            raise ServiceValidationError("path must start with /")
        original_data = dict(call.data)
        original_data.pop("method", None)
        original_data.pop("path", None)
        return await _execute_data(
            hass,
            original_data,
            call.return_response,
            method,
            path,
        )

    hass.services.async_register(
        DOMAIN,
        SERVICE_REQUEST,
        raw_request,
        schema=vol.Schema(
            {
                vol.Optional("config_entry_id"): str,
                vol.Required("method"): vol.In(["GET", "POST", "PUT", "PATCH", "DELETE"]),
                vol.Required("path"): str,
                vol.Optional("path_parameters"): dict,
                vol.Optional("query"): dict,
                vol.Optional("body"): object,
            }
        ),
        supports_response=SupportsResponse.OPTIONAL,
    )

    for service_name, operation in OPERATIONS.items():

        async def generated(
            call: ServiceCall,
            op: dict[str, Any] = operation,
        ) -> ServiceResponse | None:
            return await _execute(hass, call, op["method"], op["path"], op["path_params"])

        schema_dict: dict[Any, Any] = {
            vol.Optional("config_entry_id"): str,
            vol.Optional("query"): dict,
            vol.Optional("body"): object,
        }
        for api_name in operation["path_params"]:
            if api_name == "orgId":
                continue
            snake_name = "".join(
                ("_" + char.lower() if char.isupper() else char) for char in api_name
            ).lstrip("_")
            schema_dict[vol.Required(snake_name)] = object
        hass.services.async_register(
            DOMAIN,
            service_name,
            generated,
            schema=vol.Schema(schema_dict),
            supports_response=SupportsResponse.OPTIONAL,
        )

    domain_data[DATA_SERVICES_REGISTERED] = True


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up global FloriaX services and the full-screen dashboard."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    domain_data.setdefault(DATA_ENTRIES, {})
    _register_services(hass)
    async_register_websocket_api(hass)
    await async_setup_panel(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up one configured FloriaX organization."""
    client = FloriaXClient(
        async_get_clientsession(hass),
        entry.data[CONF_API_BASE_URL],
        entry.data[CONF_API_TOKEN],
        entry.data[CONF_ORG_ID],
    )
    try:
        await client.validate_connection()
    except FloriaXAuthenticationError as err:
        raise ConfigEntryAuthFailed(str(err)) from err
    except FloriaXConnectionError as err:
        raise ConfigEntryNotReady(str(err)) from err
    except FloriaXApiError as err:
        raise ConfigEntryNotReady(str(err)) from err

    coordinator = FloriaXCoordinator(hass, entry, client)
    await coordinator.async_config_entry_first_refresh()
    runtime = FloriaXRuntimeData(client=client, coordinator=coordinator)
    hass.data.setdefault(DOMAIN, {}).setdefault(DATA_ENTRIES, {})[entry.entry_id] = runtime

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    return True


async def _async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload one FloriaX organization."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        hass.data.get(DOMAIN, {}).get(DATA_ENTRIES, {}).pop(entry.entry_id, None)
    return unloaded
