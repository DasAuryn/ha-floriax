# FloriaX for Home Assistant

HACS custom integration for the complete FloriaX API. The integration was generated from the supplied FloriaX OpenAPI 3.1 specification and exposes **all 77 documented operations across 49 API paths** as Home Assistant actions. It also provides `floriax.request` as a generic escape hatch for future API routes.

## Features

- UI setup via Home Assistant Config Flow
- `API-TOKEN` authentication
- Organization ID is automatically inserted into `{orgId}` paths
- One Home Assistant action per documented FloriaX operation
- Generic raw request action for future/undocumented routes
- Path parameters, query parameters and JSON request bodies
- Optional service response data for use with `response_variable`
- Diagnostics with API token redaction
- Home Assistant system health integration
- German and English setup translations
- HACS and Hassfest validation workflows

## Installation with HACS

1. Publish this repository on GitHub as `DasAuryn/ha-floriax` or change the URLs in `manifest.json`.
2. In HACS open **Integrations → Custom repositories**.
3. Add the GitHub repository and select category **Integration**.
4. Install **FloriaX** and restart Home Assistant.
5. Open **Settings → Devices & services → Add integration → FloriaX**.
6. Enter the full API base URL, for example `https://your-floriax-host.example/api/v1`, the organization ID and the organization API token.

## Example: smoke detector triggers a FloriaX Quick Action

```yaml
alias: Smoke detector to FloriaX
triggers:
  - trigger: state
    entity_id: binary_sensor.smoke_detector
    to: "on"
actions:
  - action: floriax.post_grouplead_quick_actions_by_action_id_trigger
    data:
      action_id: 12
mode: single
```

## Query parameters

```yaml
action: floriax.get_grouplead_changes
data:
  query:
    since: 1234
    limit: 100
response_variable: floriax_changes
```

## Request body

Because the supplied OpenAPI specification does not define request body schemas, request bodies are intentionally accepted as arbitrary JSON-compatible objects. This allows the integration to call every documented endpoint without inventing fields that are not present in the source specification.

```yaml
action: floriax.post_grouplead_incidents
data:
  body:
    title: "Home Assistant incident"
```

Use the field names expected by your FloriaX backend.

## Raw API access

```yaml
action: floriax.request
data:
  method: POST
  path: /organizations/{orgId}/grouplead/quick-actions/12/trigger
response_variable: result
```

## API action catalog

See [API_ACTIONS.md](API_ACTIONS.md) for all 77 generated actions.

## Security

The API token is stored in the Home Assistant config entry and is never included in diagnostics. Use a FloriaX organization token with only the permissions required by the Home Assistant installation.

## Development

The OpenAPI source is copied to `openapi/floriax-openapi.json`. `tools/generate_catalog.py` can be used to inspect service names when updating the API.

## License

No license is included by default. Choose the license that fits your intended distribution before publishing the repository.
