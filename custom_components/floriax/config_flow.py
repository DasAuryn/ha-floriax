"""Config flow for FloriaX."""
from __future__ import annotations

from urllib.parse import urlparse

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import FloriaXAuthenticationError, FloriaXConnectionError, FloriaXApiError, FloriaXClient
from .const import CONF_API_BASE_URL, CONF_API_TOKEN, CONF_ORG_ID, DOMAIN


class FloriaXConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a FloriaX config flow."""

    VERSION = 1

    async def async_step_user(self, user_input: dict | None = None) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            url = user_input[CONF_API_BASE_URL].strip().rstrip("/")
            parsed = urlparse(url)
            if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                errors[CONF_API_BASE_URL] = "invalid_url"
            else:
                user_input[CONF_API_BASE_URL] = url
                client = FloriaXClient(
                    async_get_clientsession(self.hass),
                    url,
                    user_input[CONF_API_TOKEN],
                    str(user_input[CONF_ORG_ID]),
                )
                try:
                    await client.validate_connection()
                except FloriaXAuthenticationError:
                    errors["base"] = "invalid_auth"
                except FloriaXConnectionError:
                    errors["base"] = "cannot_connect"
                except FloriaXApiError:
                    # The API may deny the probe for scope reasons; configuration remains usable.
                    pass
                if not errors:
                    await self.async_set_unique_id(f"{url}|{user_input[CONF_ORG_ID]}")
                    self._abort_if_unique_id_configured()
                    return self.async_create_entry(title=f"FloriaX · Org {user_input[CONF_ORG_ID]}", data=user_input)

        schema = vol.Schema({
            vol.Required(CONF_API_BASE_URL, default=(user_input or {}).get(CONF_API_BASE_URL, "")): str,
            vol.Required(CONF_ORG_ID, default=(user_input or {}).get(CONF_ORG_ID, "")): str,
            vol.Required(CONF_API_TOKEN, default=(user_input or {}).get(CONF_API_TOKEN, "")): str,
        })
        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)
