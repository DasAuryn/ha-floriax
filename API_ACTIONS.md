# Generated FloriaX action catalog

This repository exposes all **77 operations** from the supplied FloriaX OpenAPI file.

### Alarme

| Home Assistant action | HTTP | FloriaX path |
|---|---|---|
| `floriax.get_alarms_settings` | `GET` | `/organizations/{orgId}/alarms/settings` |
| `floriax.put_alarms_settings` | `PUT` | `/organizations/{orgId}/alarms/settings` |
| `floriax.get_alarms_targets` | `GET` | `/organizations/{orgId}/alarms/targets` |
| `floriax.put_alarms_targets` | `PUT` | `/organizations/{orgId}/alarms/targets` |
| `floriax.get_alarms_events` | `GET` | `/organizations/{orgId}/alarms/events` |
| `floriax.patch_alarms_events_by_event_id` | `PATCH` | `/organizations/{orgId}/alarms/events/{eventId}` |

### Buttons

| Home Assistant action | HTTP | FloriaX path |
|---|---|---|
| `floriax.get_buttons` | `GET` | `/organizations/{orgId}/buttons` |
| `floriax.post_buttons` | `POST` | `/organizations/{orgId}/buttons` |
| `floriax.put_buttons_by_button_id` | `PUT` | `/organizations/{orgId}/buttons/{buttonId}` |
| `floriax.delete_buttons_by_button_id` | `DELETE` | `/organizations/{orgId}/buttons/{buttonId}` |
| `floriax.post_buttons_import` | `POST` | `/organizations/{orgId}/buttons/import` |

### Gateway-Gruppen

| Home Assistant action | HTTP | FloriaX path |
|---|---|---|
| `floriax.get_gateway_groups` | `GET` | `/organizations/{orgId}/gateway-groups` |
| `floriax.post_gateway_groups` | `POST` | `/organizations/{orgId}/gateway-groups` |

### Gateways

| Home Assistant action | HTTP | FloriaX path |
|---|---|---|
| `floriax.get_gateways` | `GET` | `/organizations/{orgId}/gateways` |
| `floriax.post_gateways` | `POST` | `/organizations/{orgId}/gateways` |
| `floriax.put_gateways_by_gateway_id` | `PUT` | `/organizations/{orgId}/gateways/{gatewayId}` |
| `floriax.delete_gateways_by_gateway_id` | `DELETE` | `/organizations/{orgId}/gateways/{gatewayId}` |
| `floriax.post_gateways_import` | `POST` | `/organizations/{orgId}/gateways/import` |
| `floriax.get_gateways_by_gateway_id_settings` | `GET` | `/organizations/{orgId}/gateways/{gatewayId}/settings` |
| `floriax.put_gateways_by_gateway_id_settings` | `PUT` | `/organizations/{orgId}/gateways/{gatewayId}/settings` |

### GroupLead

| Home Assistant action | HTTP | FloriaX path |
|---|---|---|
| `floriax.get_grouplead_people` | `GET` | `/organizations/{orgId}/grouplead/people` |
| `floriax.post_grouplead_people` | `POST` | `/organizations/{orgId}/grouplead/people` |
| `floriax.get_grouplead_person_avatars_by_org_id_by_person_record_id` | `GET` | `/grouplead-person-avatars/{orgId}/{personRecordId}` |
| `floriax.put_grouplead_people_by_person_record_id` | `PUT` | `/organizations/{orgId}/grouplead/people/{personRecordId}` |
| `floriax.delete_grouplead_people_by_person_record_id` | `DELETE` | `/organizations/{orgId}/grouplead/people/{personRecordId}` |
| `floriax.get_grouplead_vehicles` | `GET` | `/organizations/{orgId}/grouplead/vehicles` |
| `floriax.post_grouplead_vehicles` | `POST` | `/organizations/{orgId}/grouplead/vehicles` |
| `floriax.put_grouplead_vehicles_by_vehicle_id` | `PUT` | `/organizations/{orgId}/grouplead/vehicles/{vehicleId}` |
| `floriax.delete_grouplead_vehicles_by_vehicle_id` | `DELETE` | `/organizations/{orgId}/grouplead/vehicles/{vehicleId}` |
| `floriax.get_grouplead_teams` | `GET` | `/organizations/{orgId}/grouplead/teams` |
| `floriax.put_grouplead_teams` | `PUT` | `/organizations/{orgId}/grouplead/teams` |
| `floriax.delete_grouplead_teams_by_team_row_id` | `DELETE` | `/organizations/{orgId}/grouplead/teams/{teamRowId}` |
| `floriax.get_grouplead_map_objects` | `GET` | `/organizations/{orgId}/grouplead/map-objects` |
| `floriax.put_grouplead_map_objects` | `PUT` | `/organizations/{orgId}/grouplead/map-objects` |
| `floriax.delete_grouplead_map_objects_by_map_object_row_id` | `DELETE` | `/organizations/{orgId}/grouplead/map-objects/{mapObjectRowId}` |
| `floriax.get_grouplead_quick_actions` | `GET` | `/organizations/{orgId}/grouplead/quick-actions` |
| `floriax.post_grouplead_quick_actions` | `POST` | `/organizations/{orgId}/grouplead/quick-actions` |
| `floriax.put_grouplead_quick_actions_by_action_id` | `PUT` | `/organizations/{orgId}/grouplead/quick-actions/{actionId}` |
| `floriax.delete_grouplead_quick_actions_by_action_id` | `DELETE` | `/organizations/{orgId}/grouplead/quick-actions/{actionId}` |
| `floriax.post_grouplead_quick_actions_by_action_id_trigger` | `POST` | `/organizations/{orgId}/grouplead/quick-actions/{actionId}/trigger` |
| `floriax.get_grouplead_incidents` | `GET` | `/organizations/{orgId}/grouplead/incidents` |
| `floriax.post_grouplead_incidents` | `POST` | `/organizations/{orgId}/grouplead/incidents` |
| `floriax.put_grouplead_incidents_by_group_lead_incident_id` | `PUT` | `/organizations/{orgId}/grouplead/incidents/{groupLeadIncidentId}` |
| `floriax.delete_grouplead_incidents_by_group_lead_incident_id` | `DELETE` | `/organizations/{orgId}/grouplead/incidents/{groupLeadIncidentId}` |
| `floriax.get_grouplead_incidents_by_group_lead_incident_id_journal` | `GET` | `/organizations/{orgId}/grouplead/incidents/{groupLeadIncidentId}/journal` |
| `floriax.post_grouplead_incidents_by_group_lead_incident_id_journal` | `POST` | `/organizations/{orgId}/grouplead/incidents/{groupLeadIncidentId}/journal` |

### GroupLead Import

| Home Assistant action | HTTP | FloriaX path |
|---|---|---|
| `floriax.post_grouplead_imports_groupalarm_preview` | `POST` | `/organizations/{orgId}/grouplead/imports/groupalarm/preview` |
| `floriax.post_grouplead_imports_groupalarm_commit` | `POST` | `/organizations/{orgId}/grouplead/imports/groupalarm/commit` |

### GroupLead Sync

| Home Assistant action | HTTP | FloriaX path |
|---|---|---|
| `floriax.get_grouplead_changes` | `GET` | `/organizations/{orgId}/grouplead/changes` |
| `floriax.get_grouplead_changes_stream` | `GET` | `/organizations/{orgId}/grouplead/changes/stream` |
| `floriax.post_grouplead_push_registrations` | `POST` | `/organizations/{orgId}/grouplead/push-registrations` |
| `floriax.delete_grouplead_push_registrations_by_installation_id` | `DELETE` | `/organizations/{orgId}/grouplead/push-registrations/{installationId}` |

### GroupLead Tags

| Home Assistant action | HTTP | FloriaX path |
|---|---|---|
| `floriax.get_grouplead_tags` | `GET` | `/organizations/{orgId}/grouplead/tags` |
| `floriax.post_grouplead_tags` | `POST` | `/organizations/{orgId}/grouplead/tags` |
| `floriax.patch_grouplead_tags_by_tag_id` | `PATCH` | `/organizations/{orgId}/grouplead/tags/{tagId}` |
| `floriax.delete_grouplead_tags_by_tag_id` | `DELETE` | `/organizations/{orgId}/grouplead/tags/{tagId}` |
| `floriax.post_grouplead_tags_by_tag_id_telemetry` | `POST` | `/organizations/{orgId}/grouplead/tags/{tagId}/telemetry` |
| `floriax.put_grouplead_tags_by_tag_id_assignment` | `PUT` | `/organizations/{orgId}/grouplead/tags/{tagId}/assignment` |
| `floriax.delete_grouplead_tags_by_tag_id_assignment` | `DELETE` | `/organizations/{orgId}/grouplead/tags/{tagId}/assignment` |

### Hosted MQTT

| Home Assistant action | HTTP | FloriaX path |
|---|---|---|
| `floriax.get_hosted_mqtt_broker` | `GET` | `/organizations/{orgId}/hosted-mqtt-broker` |
| `floriax.post_hosted_mqtt_broker` | `POST` | `/organizations/{orgId}/hosted-mqtt-broker` |
| `floriax.get_hosted_mqtt_broker_users` | `GET` | `/organizations/{orgId}/hosted-mqtt-broker/users` |
| `floriax.post_hosted_mqtt_broker_users` | `POST` | `/organizations/{orgId}/hosted-mqtt-broker/users` |
| `floriax.delete_hosted_mqtt_broker_users_by_hosted_user_id` | `DELETE` | `/organizations/{orgId}/hosted-mqtt-broker/users/{hostedUserId}` |

### MQTT

| Home Assistant action | HTTP | FloriaX path |
|---|---|---|
| `floriax.get_mqtt_connections` | `GET` | `/organizations/{orgId}/mqtt-connections` |
| `floriax.post_mqtt_connections` | `POST` | `/organizations/{orgId}/mqtt-connections` |
| `floriax.get_mqtt_connections_by_connection_id_messages` | `GET` | `/organizations/{orgId}/mqtt-connections/{connectionId}/messages` |

### Sensoren

| Home Assistant action | HTTP | FloriaX path |
|---|---|---|
| `floriax.get_environment_sensors` | `GET` | `/organizations/{orgId}/environment-sensors` |
| `floriax.get_environment_sensors_by_sensor_id_readings` | `GET` | `/organizations/{orgId}/environment-sensors/{sensorId}/readings` |
| `floriax.put_environment_sensors_by_sensor_id` | `PUT` | `/organizations/{orgId}/environment-sensors/{sensorId}` |

### Things

| Home Assistant action | HTTP | FloriaX path |
|---|---|---|
| `floriax.get_things_entities` | `GET` | `/organizations/{orgId}/things/entities` |
| `floriax.post_things_entities` | `POST` | `/organizations/{orgId}/things/entities` |

### Zeiterfassung

| Home Assistant action | HTTP | FloriaX path |
|---|---|---|
| `floriax.get_time_tracking_sessions` | `GET` | `/organizations/{orgId}/time-tracking/sessions` |
| `floriax.post_time_tracking_sessions` | `POST` | `/organizations/{orgId}/time-tracking/sessions` |
| `floriax.get_time_tracking_incidents` | `GET` | `/organizations/{orgId}/time-tracking/incidents` |
| `floriax.post_time_tracking_incidents` | `POST` | `/organizations/{orgId}/time-tracking/incidents` |
| `floriax.get_time_tracking_incidents_by_incident_id` | `GET` | `/organizations/{orgId}/time-tracking/incidents/{incidentId}` |
