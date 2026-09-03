"""Asynchronous FloriaX HTTP client."""
from __future__ import annotations

from typing import Any
from urllib.parse import quote

from aiohttp import ClientError, ClientResponseError, ClientSession, ClientTimeout


class FloriaXApiError(Exception):
    """Base FloriaX API error."""


class FloriaXAuthenticationError(FloriaXApiError):
    """Authentication failed."""


class FloriaXAuthorizationError(FloriaXApiError):
    """Authorization failed."""


class FloriaXConnectionError(FloriaXApiError):
    """Connection failed."""


class FloriaXClient:
    """Small async client that can access every FloriaX API route."""

    def __init__(self, session: ClientSession, api_base_url: str, api_token: str, org_id: str, timeout: int = 30) -> None:
        self._session = session
        self.api_base_url = api_base_url.rstrip("/")
        self.api_token = api_token
        self.org_id = str(org_id)
        self.timeout = timeout

    def render_path(self, path: str, path_parameters: dict[str, Any] | None = None) -> str:
        values: dict[str, Any] = {"orgId": self.org_id}
        values.update(path_parameters or {})
        rendered = path
        import re
        for key in re.findall(r"\{([^}]+)\}", path):
            if key not in values or values[key] in (None, ""):
                raise FloriaXApiError(f"Missing path parameter: {key}")
            rendered = rendered.replace("{" + key + "}", quote(str(values[key]), safe=""))
        return rendered

    async def request(
        self,
        method: str,
        path: str,
        *,
        path_parameters: dict[str, Any] | None = None,
        query: dict[str, Any] | None = None,
        body: Any = None,
    ) -> dict[str, Any]:
        rendered_path = self.render_path(path, path_parameters)
        url = f"{self.api_base_url}/{rendered_path.lstrip('/')}"
        headers = {"API-TOKEN": self.api_token, "Accept": "application/json"}
        kwargs: dict[str, Any] = {
            "headers": headers,
            "params": query or None,
            "timeout": ClientTimeout(total=self.timeout),
        }
        if body is not None:
            kwargs["json"] = body
        try:
            async with self._session.request(method.upper(), url, **kwargs) as response:
                text = await response.text()
                if response.status == 401:
                    raise FloriaXAuthenticationError("FloriaX rejected the API token (401)")
                if response.status == 403:
                    raise FloriaXAuthorizationError("FloriaX rejected this operation (403)")
                if response.status >= 400:
                    raise FloriaXApiError(f"FloriaX HTTP {response.status}: {text[:1000]}")
                payload: Any = None
                if text:
                    ctype = response.headers.get("Content-Type", "")
                    if "json" in ctype.lower():
                        try:
                            payload = await response.json(content_type=None)
                        except Exception:
                            payload = text
                    else:
                        payload = text
                return {
                    "status": response.status,
                    "method": method.upper(),
                    "url": str(response.url),
                    "data": payload,
                }
        except (FloriaXApiError, FloriaXAuthenticationError, FloriaXAuthorizationError):
            raise
        except (ClientError, TimeoutError) as err:
            raise FloriaXConnectionError(str(err)) from err

    async def validate_connection(self) -> None:
        """Validate reachability/token with a harmless GET. 403 still proves the token reached FloriaX."""
        try:
            await self.request("GET", "/organizations/{orgId}/gateways")
        except FloriaXAuthorizationError:
            return
