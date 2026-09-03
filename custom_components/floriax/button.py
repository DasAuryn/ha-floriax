"""Buttons for FloriaX quick actions and refresh."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .api import FloriaXApiError
from .const import DATA_ENTRIES, DOMAIN
from .coordinator import FloriaXRuntimeData
from .data import extract_identifier, extract_name
from .entity import FloriaXCoordinatorEntity

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up FloriaX buttons and dynamically discover quick actions."""
    runtime: FloriaXRuntimeData = hass.data[DOMAIN][DATA_ENTRIES][entry.entry_id]
    coordinator = runtime.coordinator
    known: set[str] = set()

    async_add_entities((FloriaXRefreshButton(coordinator, entry),))

    @callback
    def discover_quick_actions() -> None:
        resource = ((coordinator.data or {}).get("resources") or {}).get("grouplead_quick_actions") or {}
        new_entities: list[FloriaXQuickActionButton] = []
        for item in resource.get("items") or []:
            action_id = extract_identifier(item, ("actionId", "action_id", "id"))
            if action_id is None or action_id in known:
                continue
            known.add(action_id)
            new_entities.append(FloriaXQuickActionButton(coordinator, entry, action_id, item))
        if new_entities:
            async_add_entities(new_entities)

    discover_quick_actions()
    entry.async_on_unload(coordinator.async_add_listener(discover_quick_actions))


class FloriaXRefreshButton(FloriaXCoordinatorEntity, ButtonEntity):
    """Force a complete FloriaX data refresh."""

    _attr_name = "Daten aktualisieren"
    _attr_icon = "mdi:refresh"
    _attr_entity_category = EntityCategory.CONFIG

    def __init__(self, coordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_refresh"

    async def async_press(self) -> None:
        await self.coordinator.async_request_refresh()


class FloriaXQuickActionButton(FloriaXCoordinatorEntity, ButtonEntity):
    """A button that triggers one FloriaX GroupLead quick action."""

    _attr_icon = "mdi:lightning-bolt-circle"

    def __init__(
        self,
        coordinator,
        entry: ConfigEntry,
        action_id: str,
        initial_item: dict[str, Any],
    ) -> None:
        super().__init__(coordinator, entry)
        self.action_id = action_id
        self._initial_item = initial_item
        self._attr_unique_id = f"{entry.entry_id}_quick_action_{action_id}"
        self._attr_name = extract_name(initial_item, "Schnellaktion")

    def _current_item(self) -> dict[str, Any] | None:
        resource = ((self.coordinator.data or {}).get("resources") or {}).get("grouplead_quick_actions") or {}
        for item in resource.get("items") or []:
            if extract_identifier(item, ("actionId", "action_id", "id")) == self.action_id:
                return item
        return None

    @property
    def available(self) -> bool:
        return super().available and self._current_item() is not None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            "action_id": self.action_id,
            "quick_action": self._current_item() or self._initial_item,
        }

    async def async_press(self) -> None:
        try:
            await self.coordinator.async_execute(
                "POST",
                "/organizations/{orgId}/grouplead/quick-actions/{actionId}/trigger",
                path_parameters={"actionId": self.action_id},
            )
        except FloriaXApiError as err:
            _LOGGER.error("Unable to trigger FloriaX quick action %s: %s", self.action_id, err)
            raise HomeAssistantError(str(err)) from err
