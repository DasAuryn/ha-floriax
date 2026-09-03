"""FloriaX data update coordinator."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryAuthFailed
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.util import dt as dt_util

from .api import FloriaXAuthenticationError, FloriaXClient, FloriaXConnectionError
from .const import CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL, DOMAIN

_LOGGER = logging.getLogger(__name__)


class FloriaXCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Coordinate the complete FloriaX dashboard snapshot."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        client: FloriaXClient,
    ) -> None:
        self.entry = entry
        self.client = client
        scan_interval = int(
            entry.options.get(
                CONF_SCAN_INTERVAL,
                entry.data.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL),
            )
        )
        super().__init__(
            hass,
            _LOGGER,
            config_entry=entry,
            name=f"{DOMAIN}_{entry.entry_id}",
            update_interval=timedelta(seconds=scan_interval),
        )

    async def _async_update_data(self) -> dict[str, Any]:
        try:
            resources = await self.client.fetch_dashboard()
        except FloriaXAuthenticationError as err:
            raise ConfigEntryAuthFailed(str(err)) from err
        except FloriaXConnectionError as err:
            raise UpdateFailed(str(err)) from err

        successful = sum(1 for resource in resources.values() if resource.get("status") == "ok")
        errors = {
            key: {
                "title": resource.get("title", key),
                "status": resource.get("http_status"),
                "message": resource.get("error", "Unbekannter Fehler"),
            }
            for key, resource in resources.items()
            if resource.get("status") != "ok"
        }
        if successful == 0 and errors:
            statuses = {value.get("status") for value in errors.values()}
            if statuses == {401}:
                raise ConfigEntryAuthFailed("FloriaX rejected the API token")
            if None in statuses:
                raise UpdateFailed(next(iter(errors.values()))["message"])

        return {
            "fetched_at": dt_util.utcnow().isoformat(),
            "successful_resources": successful,
            "total_resources": len(resources),
            "errors": errors,
            "resources": resources,
        }

    async def async_execute(
        self,
        method: str,
        path: str,
        *,
        path_parameters: dict[str, Any] | None = None,
        query: dict[str, Any] | None = None,
        body: Any = None,
        refresh: bool = True,
    ) -> dict[str, Any]:
        """Execute an API request and refresh the dashboard after mutations."""
        response = await self.client.request(
            method,
            path,
            path_parameters=path_parameters,
            query=query,
            body=body,
        )
        if refresh and method.upper() != "GET":
            await self.async_request_refresh()
        return response


@dataclass(slots=True)
class FloriaXRuntimeData:
    """Runtime objects attached to a FloriaX config entry."""

    client: FloriaXClient
    coordinator: FloriaXCoordinator
