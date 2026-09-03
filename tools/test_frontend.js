const fs = require("fs");
const vm = require("vm");
const path = require("path");

class HTMLElement {
  constructor() {
    this.isConnected = true;
  }

  attachShadow() {
    this.shadowRoot = {
      innerHTML: "",
      addEventListener() {},
      removeEventListener() {},
      querySelector() {
        return null;
      },
    };
    return this.shadowRoot;
  }
}

const registry = new Map();
global.HTMLElement = HTMLElement;
global.customElements = {
  get: (name) => registry.get(name),
  define: (name, constructor) => registry.set(name, constructor),
};
global.localStorage = {
  values: new Map(),
  getItem(key) {
    return this.values.get(key) || null;
  },
  setItem(key, value) {
    this.values.set(key, String(value));
  },
};
global.window = {
  setInterval() {
    return 1;
  },
  clearInterval() {},
  setTimeout() {},
  history: { pushState() {} },
  dispatchEvent() {},
};
global.document = { visibilityState: "visible" };
global.Event = class {};
global.navigator = { clipboard: { async writeText() {} } };

const panelPath = path.join(
  __dirname,
  "..",
  "custom_components",
  "floriax",
  "frontend",
  "floriax-panel.js",
);
vm.runInThisContext(fs.readFileSync(panelPath, "utf8"));

const Panel = registry.get("floriax-panel");
if (!Panel) throw new Error("FloriaX panel was not registered");
const panel = new Panel();

const resourceKeys = [
  "gateways",
  "gateway_groups",
  "buttons",
  "environment_sensors",
  "things_entities",
  "alarm_settings",
  "alarm_targets",
  "alarm_events",
  "mqtt_connections",
  "hosted_mqtt_broker",
  "hosted_mqtt_users",
  "time_tracking_sessions",
  "time_tracking_incidents",
  "grouplead_people",
  "grouplead_tags",
  "grouplead_vehicles",
  "grouplead_teams",
  "grouplead_map_objects",
  "grouplead_quick_actions",
  "grouplead_incidents",
  "grouplead_changes",
];

const resources = Object.fromEntries(
  resourceKeys.map((key) => [
    key,
    {
      key,
      title: key,
      icon: "mdi:test",
      section: "test",
      path: `/organizations/{orgId}/${key}`,
      kind: key.includes("settings") || key.includes("broker") ? "object" : "collection",
      status: "ok",
      http_status: 200,
      count: 1,
      items: [
        {
          id: 1,
          name: "Demo",
          active: true,
          timestamp: new Date().toISOString(),
          value: 12,
        },
      ],
      data: {
        items: [
          { id: 1, name: "Demo", active: true, value: 12 },
          { id: 2, name: "Demo 2", active: false, value: 14 },
        ],
      },
    },
  ]),
);
resources.grouplead_quick_actions.items = [
  { id: 7, name: "Brandalarm", description: "Demo" },
];
resources.grouplead_quick_actions.count = 1;

panel._payload = {
  version: "2.0.0",
  entries: [{ entry_id: "demo", title: "Demo" }],
  selected_entry_id: "demo",
  selected_entry: {
    title: "Demo",
    organization_id: "1",
    api_base_url: "https://example.invalid/api/v1",
  },
  is_admin: true,
  can_trigger_quick_actions: true,
  last_update_success: true,
  snapshot: {
    fetched_at: new Date().toISOString(),
    successful_resources: resourceKeys.length,
    total_resources: resourceKeys.length,
    errors: {},
    resources,
  },
  operations: [
    {
      service: "get_gateways",
      method: "GET",
      path: "/organizations/{orgId}/gateways",
      summary: "Gateways auflisten",
      tags: ["Gateways"],
      path_params: ["orgId"],
      requires_admin: false,
    },
    {
      service: "post_gateways",
      method: "POST",
      path: "/organizations/{orgId}/gateways",
      summary: "Gateway erstellen",
      tags: ["Gateways"],
      path_params: ["orgId"],
      requires_admin: true,
    },
  ],
};
panel._loading = false;

for (const view of [
  "overview",
  "alarms",
  "infrastructure",
  "sensors",
  "grouplead",
  "mqtt",
  "time_tracking",
  "data",
  "api",
]) {
  panel._view = view;
  panel._render();
  if (!panel.shadowRoot.innerHTML.includes("<style>")) {
    throw new Error(`No styles rendered for ${view}`);
  }
}

panel._openResource("gateways");
panel._render();
panel._confirmQuickAction(0);
panel._render();

console.log("OK: frontend runtime rendering smoke test passed");
