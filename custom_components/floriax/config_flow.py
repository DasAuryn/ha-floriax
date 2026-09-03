"""Config flow for FloriaX."""
from __future__ import annotations

from urllib.parse import urlparse, urlunparse

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import (
    FloriaXApiError,
    FloriaXAuthenticationError,
    FloriaXClient,
    FloriaXConnectionError,
)
from .const import (
    CONF_API_BASE_URL,
    CONF_API_TOKEN,
    CONF_ORG_ID,
    CONF_SCAN_INTERVAL,
    DEFAULT_SCAN_INTERVAL,
    DOMAIN,
    MAX_SCAN_INTERVAL,
    MIN_SCAN_INTERVAL,
)


def _normalize_api_url(value: str) -> str:
    """Normalize a host URL and append /api/v1 when omitted."""
    raw = value.strip().rstrip("/")
    parsed = urlparse(raw)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("invalid_url")
    path = parsed.path.rstrip("/")
    if not path.endswith("/api/v1"):
        path = f"{path}/api/v1" if path else "/api/v1"
    return urlunparse((parsed.scheme, parsed.netloc, path, "", "", ""))


async def _validate_input(
    flow: config_entries.ConfigFlow,
    data: dict,
) -> str | None:
    """Validate a FloriaX connection and return a config-flow error key."""
    client = FloriaXClient(
        async_get_clientsession(flow.hass),
        data[CONF_API_BASE_URL],
        data[CONF_API_TOKEN],
        data[CONF_ORG_ID],
    )
    try:
        await client.validate_connection()
    except FloriaXAuthenticationError:
        return "invalid_auth"
    except (FloriaXConnectionError, FloriaXApiError):
        return "cannot_connect"
    return None


class FloriaXConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a FloriaX config flow."""

    VERSION = 1

    async def async_step_user(self, user_input: dict | None = None) -> FlowResult:
        """Create a new FloriaX organization entry."""
        errors: dict[str, str] = {}
        normalized_input = dict(user_input or {})
        if user_input is not None:
            try:
                normalized_input[CONF_API_BASE_URL] = _normalize_api_url(
                    str(user_input[CONF_API_BASE_URL])
                )
            except ValueError:
                errors[CONF_API_BASE_URL] = "invalid_url"
            else:
                normalized_input[CONF_ORG_ID] = str(user_input[CONF_ORG_ID]).strip()
                normalized_input[CONF_API_TOKEN] = str(user_input[CONF_API_TOKEN]).strip()
                normalized_input[CONF_SCAN_INTERVAL] = int(
                    user_input.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL)
                )
                if error := await _validate_input(self, normalized_input):
                    errors["base"] = error
                else:
                    await self.async_set_unique_id(
                        f"{normalized_input[CONF_API_BASE_URL]}|{normalized_input[CONF_ORG_ID]}"
                    )
                    self._abort_if_unique_id_configured()
                    return self.async_create_entry(
                        title=f"FloriaX · Org {normalized_input[CONF_ORG_ID]}",
                        data=normalized_input,
                    )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_API_BASE_URL,
                        default=normalized_input.get(CONF_API_BASE_URL, ""),
                    ): str,
                    vol.Required(
                        CONF_ORG_ID,
                        default=normalized_input.get(CONF_ORG_ID, ""),
                    ): str,
                    vol.Required(
                        CONF_API_TOKEN,
                        default=normalized_input.get(CONF_API_TOKEN, ""),
                    ): str,
                    vol.Optional(
                        CONF_SCAN_INTERVAL,
                        default=normalized_input.get(
                            CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL
                        ),
                    ): vol.All(
                        vol.Coerce(int),
                        vol.Range(min=MIN_SCAN_INTERVAL, max=MAX_SCAN_INTERVAL),
                    ),
                }
            ),
            errors=errors,
        )

    async def async_step_reauth(self, entry_data: dict) -> FlowResult:
        """Start reauthentication after the API token was rejected."""
        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(
        self,
        user_input: dict | None = None,
    ) -> FlowResult:
        """Validate and store a replacement API token."""
        errors: dict[str, str] = {}
        entry = self._get_reauth_entry()
        if user_input is not None:
            token = str(user_input[CONF_API_TOKEN]).strip()
            candidate = dict(entry.data)
            candidate[CONF_API_TOKEN] = token
            if error := await _validate_input(self, candidate):
                errors["base"] = error
            else:
                return self.async_update_reload_and_abort(
                    entry,
                    data_updates={CONF_API_TOKEN: token},
                )

        return self.async_show_form(
            step_id="reauth_confirm",
            data_schema=vol.Schema({vol.Required(CONF_API_TOKEN): str}),
            errors=errors,
            description_placeholders={"name": entry.title},
        )

    @staticmethod
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> config_entries.OptionsFlow:
        """Return the FloriaX options flow."""
        return FloriaXOptionsFlow()


class FloriaXOptionsFlow(config_entries.OptionsFlow):
    """Manage the dashboard refresh interval."""

    async def async_step_init(self, user_input: dict | None = None) -> FlowResult:
        """Show and store editable integration options."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_SCAN_INTERVAL,
                        default=self.config_entry.options.get(
                            CONF_SCAN_INTERVAL,
                            self.config_entry.data.get(
                                CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL
                            ),
                        ),
                    ): vol.All(
                        vol.Coerce(int),
                        vol.Range(min=MIN_SCAN_INTERVAL, max=MAX_SCAN_INTERVAL),
                    )
                }
            ),
        )
