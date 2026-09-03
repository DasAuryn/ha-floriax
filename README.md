# FloriaX for Home Assistant

FloriaX is a HACS custom integration with a complete full-screen Home Assistant web application. After the integration is configured, Home Assistant automatically loads every readable top-level area of the supplied FloriaX OpenAPI and exposes the result through a responsive operations dashboard in the Home Assistant sidebar.

The integration also keeps all 77 documented API operations available as Home Assistant actions and in the built-in API Explorer.

## Highlights

- Full-screen **FloriaX** sidebar application
- Automatic synchronization of 21 readable dashboard resources
- Overview with live counts, API coverage and recent alarm events
- Alarm center with guarded GroupLead quick-action triggering
- Gateways, gateway groups and hardware buttons
- Environment sensors and Things entities
- GroupLead people, tags, vehicles, teams, map objects, incidents and change feed
- MQTT connections, hosted broker and users
- Time-tracking sessions and incidents
- Related details loaded without entering IDs manually:
  - gateway settings
  - sensor readings with automatic numeric chart
  - MQTT messages
  - time-tracking incident details
  - GroupLead incident journal
- Raw-data browser for every synchronized API area
- Built-in API Explorer for all 77 OpenAPI operations
- API tokens remain in the Home Assistant Python backend and are never passed to the browser
- Automatic Home Assistant summary sensors, diagnostic binary sensors and one button entity per Quick Action
- German and English setup dialogs

## Dashboard architecture

```text
FloriaX API
    ↓ API-TOKEN is used only here
Home Assistant Python integration
    ↓ protected Home Assistant WebSocket commands
FloriaX sidebar web application
```

The browser never receives the FloriaX API token. The FloriaX sidebar dashboard, synchronized data, API Explorer and direct Quick Action controls are restricted to Home Assistant administrators because API responses and alarm functions may contain sensitive operational or personal data. Quick Action button entities remain available to Home Assistant automations and are governed by normal Home Assistant entity permissions.

## Installation with HACS

1. In HACS open **Integrations → Custom repositories**.
2. Add `https://github.com/DasAuryn/ha-floriax` with category **Integration**.
3. Install **FloriaX**.
4. Restart Home Assistant.
5. Open **Settings → Devices & services → Add integration → FloriaX**.
6. Enter the FloriaX server URL, organization ID and organization API token.

You can enter either a server URL such as:

```text
https://floriax.example.com
```

or the full API base URL:

```text
https://floriax.example.com/api/v1
```

The integration appends `/api/v1` automatically when it is missing.

After setup, **FloriaX** appears directly in the Home Assistant sidebar.

A GitHub release is created automatically whenever a `v*` tag is pushed.

## Updating from version 1.x

1. Update or redownload FloriaX in HACS.
2. Restart Home Assistant.
3. Hard-refresh the browser once if an old panel asset is still cached.

Existing config entries remain compatible. The default refresh interval is 30 seconds and can be changed through the integration's **Configure** dialog.

## Home Assistant entities

The integration creates an organization device with summary entities such as:

```text
sensor.floriax_gateways
sensor.floriax_buttons
sensor.floriax_environment_sensors
sensor.floriax_active_alarm_events
sensor.floriax_grouplead_people
sensor.floriax_grouplead_vehicles
sensor.floriax_grouplead_teams
sensor.floriax_grouplead_incidents
binary_sensor.floriax_api_connection
binary_sensor.floriax_active_alarm
binary_sensor.floriax_api_partially_restricted
button.floriax_update_data
```

Each discovered GroupLead Quick Action is also created as a `button` entity. Entity IDs are assigned by Home Assistant and may vary.

## Example: smoke detector triggers a Quick Action entity

After Home Assistant has discovered the Quick Action, an automation can press its button entity:

```yaml
alias: Rauchmelder an FloriaX
triggers:
  - trigger: state
    entity_id: binary_sensor.rauchmelder_wohnzimmer
    to: "on"
actions:
  - action: button.press
    target:
      entity_id: button.floriax_brandalarm
mode: single
```

The generated API action remains available as an alternative:

```yaml
alias: Rauchmelder an FloriaX API
triggers:
  - trigger: state
    entity_id: binary_sensor.rauchmelder_wohnzimmer
    to: "on"
actions:
  - action: floriax.post_grouplead_quick_actions_by_action_id_trigger
    data:
      action_id: 12
mode: single
```

## Generic API action

```yaml
action: floriax.request
data:
  method: GET
  path: /organizations/{orgId}/grouplead/changes
  query:
    limit: 100
response_variable: result
```

The organization ID is inserted automatically. Request bodies are accepted as JSON-compatible values because the supplied OpenAPI does not define body schemas.

## API catalog

See [API_ACTIONS.md](API_ACTIONS.md) for all generated Home Assistant actions. The same operation catalog is available graphically under **FloriaX → API Explorer**.

## Security

Use an organization token with only the permissions required by the Home Assistant installation. The token is stored in the Home Assistant config entry, is redacted from diagnostics and is not included in dashboard WebSocket responses.

Alarm and incident actions can have real operational consequences. Test workflows with a dedicated test organization or non-production Quick Action before connecting safety-related automations.

## Development checks

```bash
python tools/validate_repo.py
node --check custom_components/floriax/frontend/floriax-panel.js
node tools/test_frontend.js
```

The OpenAPI source is stored at `openapi/floriax-openapi.json`.

## License

No license is included by default. Add the license that matches the intended distribution model before accepting outside contributions.
