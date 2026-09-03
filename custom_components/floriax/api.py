"""Asynchronous FloriaX HTTP client."""
from __future__ import annotations

import asyncio
import json
import re
from typing import Any
from urllib.parse import quote

from aiohttp import ClientError, ClientSession, ClientTimeout

from .data import DASHBOARD_RESOURCES, extract_items


class FloriaXApiError(Exception):
    """Base FloriaX API error."""

    def __init__(self, message: str, *, status: int | None = None, response: Any = None) -> None:
        super().__init__(message)
        self.status = status
        self.response = response


class FloriaXAuthenticationError(FloriaXApiError):
    """Authentication failed."""


class FloriaXAuthorizationError(FloriaXApiError):
    """Authorization failed."""


class FloriaXConnectionError(FloriaXApiError):
    """Connection failed."""


class FloriaXClient:
    """Async client that can access every FloriaX API route."""

    def __init__(
        self,
        session: ClientSession,
        api_base_url: str,
        api_token: str,
        org_id: str,
        timeout: int = 30,
    ) -> None:
        self._session = session
        self.api_base_url = api_base_url.rstrip("/")
        self.api_token = api_token
        self.org_id = str(org_id)
        self.timeout = timeout

    def render_path(self, path: str, path_parameters: dict[str, Any] | None = None) -> str:
        """Fill path parameters while URL-encoding values."""
        values: dict[str, Any] = {"orgId": self.org_id}
        values.update(path_parameters or {})
        rendered = path
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
        """Perform one authenticated FloriaX request."""
        rendered_path = self.render_path(path, path_parameters)
        url = f"{self.api_base_url}/{rendered_path.lstrip('/')}"
        headers = {"API-TOKEN": self.api_token, "Accept": "application/json"}
        kwargs: dict[str, Any] = {
            "headers": headers,
            "params": query or None,
            "timeout": ClientTimeout(total=self.timeout),
        }
        if body is not None:
            headers["Content-Type"] = "application/json"
            kwargs["json"] = body

        try:
            async with self._session.request(method.upper(), url, **kwargs) as response:
                raw = await response.read()
                content_type = response.headers.get("Content-Type", "").lower()
                payload: Any = None
                text = ""
                if raw:
                    if "json" in content_type:
                        try:
                            payload = json.loads(raw.decode(response.charset or "utf-8"))
                        except (UnicodeDecodeError, json.JSONDecodeError):
                            text = raw.decode(response.charset or "utf-8", errors="replace")
                            payload = text
                    elif content_type.startswith("text/") or any(
                        marker in content_type for marker in ("xml", "csv", "javascript")
                    ):
                        text = raw.decode(response.charset or "utf-8", errors="replace")
                        payload = text
                    else:
                        payload = {
                            "binary": True,
                            "content_type": content_type or "application/octet-stream",
                            "size": len(raw),
                        }

                if response.status == 401:
                    raise FloriaXAuthenticationError(
                        "FloriaX rejected the API token (401)",
                        status=401,
                        response=payload,
                    )
                if response.status == 403:
                    raise FloriaXAuthorizationError(
                        "FloriaX rejected this operation (403)",
                        status=403,
                        response=payload,
                    )
                if response.status >= 400:
                    detail = text[:1000] if text else response.reason
                    if isinstance(payload, (dict, list)):
                        detail = json.dumps(payload, ensure_ascii=False)[:1000]
                    raise FloriaXApiError(
                        f"FloriaX HTTP {response.status}: {detail}",
                        status=response.status,
                        response=payload,
                    )

                return {
                    "status": response.status,
                    "method": method.upper(),
                    "url": str(response.url),
                    "data": payload,
                }
        except FloriaXApiError:
            raise
        except (ClientError, TimeoutError) as err:
            raise FloriaXConnectionError(str(err)) from err

    async def validate_connection(self) -> None:
        """Validate reachability and token with a harmless GET."""
        try:
            await self.request("GET", "/organizations/{orgId}/gateways")
        except FloriaXAuthorizationError:
            return

    async def fetch_dashboard(self) -> dict[str, Any]:
        """Fetch every top-level readable resource used by the web dashboard."""
        semaphore = asyncio.Semaphore(6)

        async def fetch_resource(definition: dict[str, Any]) -> tuple[str, dict[str, Any]]:
            async with semaphore:
                try:
                    response = await self.request("GET", definition["path"])
                    payload = response.get("data")
                    items = extract_items(payload)
                    result = {
                        "key": definition["key"],
                        "title": definition["title"],
                        "icon": definition["icon"],
                        "section": definition["section"],
                        "path": definition["path"],
                        "kind": definition["kind"],
                        "status": "ok",
                        "http_status": response.get("status"),
                        "count": (
                            len(items)
                            if definition["kind"] == "collection"
                            else (1 if payload is not None else 0)
                        ),
                        "items": items,
                        "data": payload,
                    }
                except FloriaXApiError as err:
                    result = {
                        "key": definition["key"],
                        "title": definition["title"],
                        "icon": definition["icon"],
                        "section": definition["section"],
                        "path": definition["path"],
                        "kind": definition["kind"],
                        "status": "error",
                        "http_status": err.status,
                        "error": str(err),
                        "count": 0,
                        "items": [],
                        "data": None,
                    }
                return definition["key"], result

        pairs = await asyncio.gather(*(fetch_resource(item) for item in DASHBOARD_RESOURCES))
        return {key: value for key, value in pairs}
