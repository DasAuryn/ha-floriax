const NAV_ITEMS = [
  { id: "overview", label: "Übersicht", icon: "mdi:view-dashboard-outline" },
  { id: "alarms", label: "Alarme", icon: "mdi:alarm-light-outline", count: "alarm_events" },
  { id: "infrastructure", label: "Infrastruktur", icon: "mdi:access-point-network", count: "gateways" },
  { id: "sensors", label: "Sensoren & Things", icon: "mdi:thermometer-lines", count: "environment_sensors" },
  { id: "grouplead", label: "GroupLead", icon: "mdi:account-group-outline", count: "grouplead_people" },
  { id: "mqtt", label: "MQTT", icon: "mdi:connection", count: "mqtt_connections" },
  { id: "time_tracking", label: "Zeiterfassung", icon: "mdi:timer-outline", count: "time_tracking_sessions" },
  { id: "data", label: "Alle Daten", icon: "mdi:database-outline" },
  { id: "api", label: "API-Explorer", icon: "mdi:api" },
];

const RELATED_ACTIONS = {
  gateways: {
    label: "Einstellungen laden",
    icon: "mdi:cog-outline",
    path: "/organizations/{orgId}/gateways/{gatewayId}/settings",
    param: "gatewayId",
    idKeys: ["gatewayId", "gateway_id", "id"],
  },
  environment_sensors: {
    label: "Messwerte laden",
    icon: "mdi:chart-line",
    path: "/organizations/{orgId}/environment-sensors/{sensorId}/readings",
    param: "sensorId",
    idKeys: ["sensorId", "sensor_id", "id"],
  },
  mqtt_connections: {
    label: "Nachrichten laden",
    icon: "mdi:message-text-clock-outline",
    path: "/organizations/{orgId}/mqtt-connections/{connectionId}/messages",
    param: "connectionId",
    idKeys: ["connectionId", "connection_id", "id"],
  },
  time_tracking_incidents: {
    label: "Details laden",
    icon: "mdi:file-document-outline",
    path: "/organizations/{orgId}/time-tracking/incidents/{incidentId}",
    param: "incidentId",
    idKeys: ["incidentId", "incident_id", "id"],
  },
  grouplead_incidents: {
    label: "Tagebuch laden",
    icon: "mdi:notebook-outline",
    path: "/organizations/{orgId}/grouplead/incidents/{groupLeadIncidentId}/journal",
    param: "groupLeadIncidentId",
    idKeys: ["groupLeadIncidentId", "group_lead_incident_id", "rowId", "row_id", "id"],
  },
};

const NAME_KEYS = [
  "name",
  "title",
  "label",
  "displayName",
  "display_name",
  "eventName",
  "event_name",
  "description",
  "room",
  "location",
  "callsign",
  "callSign",
  "username",
  "mac",
  "uuid",
];

const ID_KEYS = [
  "id",
  "rowId",
  "row_id",
  "recordId",
  "record_id",
  "gatewayId",
  "gateway_id",
  "buttonId",
  "button_id",
  "sensorId",
  "sensor_id",
  "eventId",
  "event_id",
  "connectionId",
  "connection_id",
  "incidentId",
  "incident_id",
  "personRecordId",
  "person_record_id",
  "tagId",
  "tag_id",
  "vehicleId",
  "vehicle_id",
  "teamRowId",
  "team_row_id",
  "mapObjectRowId",
  "map_object_row_id",
  "actionId",
  "action_id",
  "groupLeadIncidentId",
  "group_lead_incident_id",
];

const INACTIVE_STATES = new Set([
  "archived",
  "closed",
  "resolved",
  "completed",
  "complete",
  "finished",
  "ended",
  "inactive",
  "disabled",
  "offline",
  "disconnected",
  "false",
  "0",
]);

class FloriaXPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._panel = null;
    this._narrow = false;
    this._route = null;
    this._payload = null;
    this._loading = true;
    this._refreshing = false;
    this._error = null;
    this._view = localStorage.getItem("floriax_view") || "overview";
    this._search = "";
    this._resourceFilter = "";
    this._apiFilter = "";
    this._selectedOperation = null;
    this._apiQueryText = "{}";
    this._apiBodyText = "{}";
    this._apiResult = null;
    this._apiRunning = false;
    this._modal = null;
    this._toast = null;
    this._loadedOnce = false;
    this._refreshTimer = null;
    this._boundClick = (event) => this._handleClick(event);
    this._boundInput = (event) => this._handleInput(event);
    this._boundChange = (event) => this._handleChange(event);
  }

  set hass(value) {
    this._hass = value;
    if (this.isConnected && !this._loadedOnce) {
      this._loadedOnce = true;
      this._load(false);
    }
  }

  get hass() {
    return this._hass;
  }

  set panel(value) {
    this._panel = value;
  }

  set narrow(value) {
    this._narrow = Boolean(value);
    this._render();
  }

  set route(value) {
    this._route = value;
  }

  connectedCallback() {
    this.shadowRoot.addEventListener("click", this._boundClick);
    this.shadowRoot.addEventListener("input", this._boundInput);
    this.shadowRoot.addEventListener("change", this._boundChange);
    this._render();
    if (this._hass && !this._loadedOnce) {
      this._loadedOnce = true;
      this._load(false);
    }
    this._refreshTimer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !this._refreshing && this._hass) {
        this._load(false, true);
      }
    }, 30000);
  }

  disconnectedCallback() {
    this.shadowRoot.removeEventListener("click", this._boundClick);
    this.shadowRoot.removeEventListener("input", this._boundInput);
    this.shadowRoot.removeEventListener("change", this._boundChange);
    if (this._refreshTimer) {
      window.clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
  }

  async _load(refresh = false, quiet = false) {
    if (!this._hass) return;
    if (refresh) this._refreshing = true;
    if (!quiet && !this._payload) this._loading = true;
    this._error = null;
    this._render();
    const storedEntry = localStorage.getItem("floriax_entry_id") || undefined;
    try {
      const result = await this._hass.callWS({
        type: "floriax/dashboard/get",
        entry_id: storedEntry,
        refresh,
      });
      this._payload = result;
      if (result.selected_entry_id) {
        localStorage.setItem("floriax_entry_id", result.selected_entry_id);
      }
      if (!this._selectedOperation && result.operations?.length) {
        this._selectedOperation = result.operations[0].service;
      }
    } catch (error) {
      this._error = this._errorMessage(error);
    } finally {
      this._loading = false;
      this._refreshing = false;
      this._render();
    }
  }

  _errorMessage(error) {
    if (!error) return "Unbekannter Fehler";
    if (typeof error === "string") return error;
    return error.message || error.body?.message || JSON.stringify(error);
  }

  _snapshot() {
    return this._payload?.snapshot || null;
  }

  _resources() {
    return this._snapshot()?.resources || {};
  }

  _resource(key) {
    return this._resources()[key] || null;
  }

  _items(key) {
    const resource = this._resource(key);
    return Array.isArray(resource?.items) ? resource.items : [];
  }

  _count(key) {
    const resource = this._resource(key);
    if (!resource || resource.status !== "ok") return 0;
    return Number.isFinite(resource.count) ? resource.count : this._items(key).length;
  }

  _activeCount(key) {
    return this._items(key).filter((item) => this._isActive(item)).length;
  }

  _isActive(item) {
    if (!item || typeof item !== "object") return false;
    for (const key of ["archived", "isArchived", "is_archived", "closed", "resolved"]) {
      if (item[key] === true) return false;
    }
    for (const key of ["active", "isActive", "is_active", "online", "connected", "enabled"]) {
      if (typeof item[key] === "boolean") return item[key];
    }
    for (const key of ["status", "state", "connectionStatus", "connection_status"]) {
      if (item[key] === undefined || item[key] === null) continue;
      return !INACTIVE_STATES.has(String(item[key]).trim().toLowerCase());
    }
    return true;
  }

  _name(item, fallback = "Eintrag") {
    if (item === null || item === undefined) return fallback;
    if (typeof item !== "object") return String(item);
    for (const key of NAME_KEYS) {
      if (item[key] !== undefined && item[key] !== null && item[key] !== "") {
        return String(item[key]);
      }
    }
    const id = this._id(item);
    return id ? `${fallback} ${id}` : fallback;
  }

  _id(item, keys = ID_KEYS) {
    if (!item || typeof item !== "object") return null;
    for (const key of keys) {
      if (item[key] !== undefined && item[key] !== null && item[key] !== "") {
        return String(item[key]);
      }
    }
    return null;
  }

  _formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  _relativeTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const diff = date.getTime() - Date.now();
    const seconds = Math.round(diff / 1000);
    const formatter = new Intl.RelativeTimeFormat("de-DE", { numeric: "auto" });
    if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
    const minutes = Math.round(seconds / 60);
    if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
    return formatter.format(Math.round(hours / 24), "day");
  }

  _findTimestamp(item) {
    if (!item || typeof item !== "object") return null;
    for (const key of [
      "createdAt",
      "created_at",
      "timestamp",
      "time",
      "date",
      "updatedAt",
      "updated_at",
      "lastSeenAt",
      "last_seen_at",
      "startedAt",
      "started_at",
    ]) {
      if (item[key]) return item[key];
    }
    return null;
  }

  _primitiveSummary(item, max = 3) {
    if (!item || typeof item !== "object") return String(item ?? "");
    const ignored = new Set([...NAME_KEYS, ...ID_KEYS, "avatarUrl", "avatarSourceUrl"]);
    const values = [];
    for (const [key, value] of Object.entries(item)) {
      if (ignored.has(key) || value === null || value === undefined || value === "") continue;
      if (["string", "number", "boolean"].includes(typeof value)) {
        let display = String(value);
        if (/at$|time|date/i.test(key)) display = this._formatDate(value);
        values.push(`${this._humanize(key)}: ${display}`);
      }
      if (values.length >= max) break;
    }
    return values.join(" · ") || "Keine weiteren Angaben";
  }

  _humanize(value) {
    return String(value)
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/^./, (char) => char.toUpperCase());
  }

  _escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  _json(value) {
    let json;
    try {
      json = JSON.stringify(value, null, 2);
    } catch (_error) {
      json = String(value);
    }
    return this._escape(json);
  }

  _showToast(message, kind = "success") {
    this._toast = { message, kind };
    this._render();
    window.setTimeout(() => {
      if (this._toast?.message === message) {
        this._toast = null;
        this._render();
      }
    }, 3500);
  }

  async _handleClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (action === "close-modal" && target.classList.contains("modal-backdrop") && event.target !== target) {
      return;
    }

    if (action === "navigate") {
      this._view = target.dataset.view;
      localStorage.setItem("floriax_view", this._view);
      this._render();
      return;
    }
    if (action === "refresh") {
      await this._load(true);
      return;
    }
    if (action === "open-config") {
      window.history.pushState(null, "", "/config/integrations/dashboard");
      window.dispatchEvent(new Event("location-changed"));
      return;
    }
    if (action === "close-modal") {
      this._modal = null;
      this._render();
      return;
    }
    if (action === "open-resource") {
      this._openResource(target.dataset.resource);
      return;
    }
    if (action === "open-item") {
      const resource = target.dataset.resource;
      const index = Number(target.dataset.index);
      this._openItem(resource, index);
      return;
    }
    if (action === "load-related") {
      const resource = target.dataset.resource;
      const index = Number(target.dataset.index);
      await this._loadRelated(resource, index);
      return;
    }
    if (action === "quick-action") {
      const index = Number(target.dataset.index);
      this._confirmQuickAction(index);
      return;
    }
    if (action === "confirm-quick-action") {
      await this._triggerQuickAction();
      return;
    }
    if (action === "select-operation") {
      this._selectedOperation = target.dataset.service;
      this._apiResult = null;
      this._apiQueryText = "{}";
      this._apiBodyText = "{}";
      this._render();
      return;
    }
    if (action === "execute-api") {
      await this._executeApi();
      return;
    }
    if (action === "copy-json") {
      const source = target.dataset.source;
      let data = null;
      if (source === "api-result") data = this._apiResult;
      if (source === "modal" && this._modal) data = this._modal.raw;
      try {
        await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        this._showToast("JSON wurde kopiert");
      } catch (_error) {
        this._showToast("Kopieren nicht möglich", "error");
      }
    }
  }

  _handleInput(event) {
    const field = event.target.dataset.field;
    if (!field) return;
    if (field === "search") {
      this._search = event.target.value;
      this._render();
    } else if (field === "resource-filter") {
      this._resourceFilter = event.target.value;
      this._render();
    } else if (field === "api-filter") {
      this._apiFilter = event.target.value;
      this._render();
    } else if (field === "api-query") {
      this._apiQueryText = event.target.value;
    } else if (field === "api-body") {
      this._apiBodyText = event.target.value;
    }
  }

  async _handleChange(event) {
    if (event.target.dataset.field === "entry") {
      localStorage.setItem("floriax_entry_id", event.target.value);
      this._payload = null;
      this._loadedOnce = true;
      await this._load(false);
    }
  }

  _openResource(key) {
    const resource = this._resource(key);
    if (!resource) return;
    this._modal = {
      type: "raw",
      title: resource.title || this._humanize(key),
      subtitle: `${resource.count || 0} Einträge · ${resource.path || ""}`,
      raw: resource.data,
      chart: this._renderChart(resource.data),
    };
    this._render();
  }

  _openItem(key, index) {
    const resource = this._resource(key);
    const item = this._items(key)[index];
    if (!resource || item === undefined) return;
    this._modal = {
      type: "raw",
      title: this._name(item, resource.title || "Eintrag"),
      subtitle: resource.title || this._humanize(key),
      raw: item,
      chart: this._renderChart(item),
    };
    this._render();
  }

  async _loadRelated(key, index) {
    const definition = RELATED_ACTIONS[key];
    const item = this._items(key)[index];
    if (!definition || !item) return;
    const id = this._id(item, definition.idKeys);
    if (!id) {
      this._showToast("In diesem Datensatz wurde keine passende ID gefunden", "error");
      return;
    }
    this._modal = {
      type: "loading",
      title: definition.label,
      subtitle: this._name(item, "Eintrag"),
    };
    this._render();
    try {
      const result = await this._hass.callWS({
        type: "floriax/dashboard/request",
        entry_id: this._payload?.selected_entry_id,
        method: "GET",
        path: definition.path,
        path_parameters: { [definition.param]: id },
      });
      this._modal = {
        type: "raw",
        title: definition.label,
        subtitle: this._name(item, "Eintrag"),
        raw: result,
        chart: this._renderChart(result?.data),
      };
    } catch (error) {
      this._modal = {
        type: "error",
        title: definition.label,
        subtitle: this._errorMessage(error),
      };
    }
    this._render();
  }

  _confirmQuickAction(index) {
    if (!this._payload?.can_trigger_quick_actions) {
      this._showToast(
        "Für die Auslösung werden Administratorrechte oder eine Freigabe in den FloriaX-Einstellungen benötigt",
        "error",
      );
      return;
    }
    const item = this._items("grouplead_quick_actions")[index];
    if (!item) return;
    const id = this._id(item, ["actionId", "action_id", "id"]);
    if (!id) {
      this._showToast("Für diese Schnellaktion wurde keine ID gefunden", "error");
      return;
    }
    this._modal = {
      type: "confirm-quick-action",
      title: "Alarmaktion auslösen?",
      subtitle: this._name(item, "Schnellaktion"),
      actionId: id,
      raw: item,
    };
    this._render();
  }

  async _triggerQuickAction() {
    if (!this._modal?.actionId) return;
    const actionId = this._modal.actionId;
    const title = this._modal.subtitle;
    this._modal = {
      type: "loading",
      title: "Schnellaktion wird ausgelöst",
      subtitle: title,
    };
    this._render();
    try {
      await this._hass.callWS({
        type: "floriax/dashboard/quick_action",
        entry_id: this._payload?.selected_entry_id,
        action_id: actionId,
      });
      this._modal = null;
      this._showToast(`${title} wurde ausgelöst`);
      await this._load(false, true);
    } catch (error) {
      this._modal = {
        type: "error",
        title: "Schnellaktion fehlgeschlagen",
        subtitle: this._errorMessage(error),
      };
      this._render();
    }
  }

  _selectedOperationData() {
    return this._payload?.operations?.find((operation) => operation.service === this._selectedOperation) || null;
  }

  _parseJson(value, label) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return undefined;
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      throw new Error(`${label} enthält kein gültiges JSON: ${error.message}`);
    }
  }

  async _executeApi() {
    const operation = this._selectedOperationData();
    if (!operation) return;
    if (operation.requires_admin && !this._payload?.is_admin) {
      this._showToast("Für schreibende Operationen werden Administratorrechte benötigt", "error");
      return;
    }

    const pathParameters = {};
    for (const param of operation.path_params || []) {
      if (param === "orgId") continue;
      const input = this.shadowRoot.querySelector(`[data-path-param="${param}"]`);
      if (!input?.value) {
        this._showToast(`Pfadparameter ${param} fehlt`, "error");
        return;
      }
      pathParameters[param] = input.value;
    }

    let query;
    let body;
    try {
      query = this._parseJson(this._apiQueryText, "Query");
      const bodyText = String(this._apiBodyText || "").trim();
      body = ["POST", "PUT", "PATCH"].includes(operation.method)
        ? this._parseJson(bodyText, "Body")
        : (bodyText && bodyText !== "{}" ? this._parseJson(bodyText, "Body") : undefined);
      if (query !== undefined && (typeof query !== "object" || Array.isArray(query) || query === null)) {
        throw new Error("Query muss ein JSON-Objekt sein");
      }
    } catch (error) {
      this._showToast(error.message, "error");
      return;
    }

    this._apiRunning = true;
    this._apiResult = null;
    this._render();
    try {
      this._apiResult = await this._hass.callWS({
        type: "floriax/dashboard/request",
        entry_id: this._payload?.selected_entry_id,
        method: operation.method,
        path: operation.path,
        path_parameters: pathParameters,
        query,
        body,
      });
      this._showToast("API-Aufruf erfolgreich");
      if (operation.method !== "GET") await this._load(false, true);
    } catch (error) {
      this._apiResult = { error: this._errorMessage(error) };
      this._showToast("API-Aufruf fehlgeschlagen", "error");
    } finally {
      this._apiRunning = false;
      this._render();
    }
  }

  _render() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `${this._styles()}${this._content()}${this._renderModal()}${this._renderToast()}`;
  }

  _content() {
    if (this._loading && !this._payload) return this._renderLoadingShell();
    if (this._error && !this._payload) return this._renderFatalError();

    return `
      <div class="app-shell ${this._narrow ? "is-narrow" : ""}">
        ${this._renderSidebar()}
        <div class="workspace">
          ${this._renderTopbar()}
          <main class="content">
            ${this._error ? `<div class="banner error"><ha-icon icon="mdi:alert-circle-outline"></ha-icon><span>${this._escape(this._error)}</span></div>` : ""}
            ${this._renderView()}
          </main>
        </div>
      </div>
    `;
  }

  _renderLoadingShell() {
    return `
      <div class="center-state">
        <div class="brand-logo large"><ha-icon icon="mdi:shield-home"></ha-icon></div>
        <div class="spinner"></div>
        <h1>FloriaX wird geladen</h1>
        <p>Home Assistant sammelt alle verfügbaren Organisationsdaten.</p>
      </div>
    `;
  }

  _renderFatalError() {
    return `
      <div class="center-state">
        <div class="brand-logo large danger"><ha-icon icon="mdi:cloud-alert-outline"></ha-icon></div>
        <h1>FloriaX konnte nicht geladen werden</h1>
        <p>${this._escape(this._error)}</p>
        <button class="button primary" data-action="refresh"><ha-icon icon="mdi:refresh"></ha-icon>Erneut versuchen</button>
      </div>
    `;
  }

  _renderSidebar() {
    const org = this._payload?.selected_entry?.organization_id || "—";
    return `
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-logo"><ha-icon icon="mdi:shield-home"></ha-icon></div>
          <div class="brand-copy">
            <strong>FloriaX</strong>
            <span>Organisation ${this._escape(org)}</span>
          </div>
        </div>
        <nav>
          ${NAV_ITEMS.map((item) => {
            const count = item.count ? this._count(item.count) : null;
            return `
              <button class="nav-item ${this._view === item.id ? "active" : ""}" data-action="navigate" data-view="${item.id}">
                <ha-icon icon="${item.icon}"></ha-icon>
                <span>${item.label}</span>
                ${count !== null ? `<em>${count}</em>` : ""}
              </button>
            `;
          }).join("")}
        </nav>
        <div class="sidebar-footer">
          <div class="security-note">
            <ha-icon icon="mdi:shield-check-outline"></ha-icon>
            <div><strong>Geschützt</strong><span>API-Token bleibt im HA-Backend</span></div>
          </div>
          <span class="version">Version ${this._escape(this._payload?.version || this._panel?.config?.version || "")}</span>
        </div>
      </aside>
    `;
  }

  _renderTopbar() {
    const entry = this._payload?.selected_entry;
    const entries = this._payload?.entries || [];
    const snapshot = this._snapshot();
    const connected = this._payload?.last_update_success !== false && Boolean(snapshot);
    return `
      <header class="topbar">
        <div class="mobile-brand">
          <div class="brand-logo"><ha-icon icon="mdi:shield-home"></ha-icon></div>
          <strong>FloriaX</strong>
        </div>
        <div class="page-title">
          <span class="eyebrow">FloriaX Operations Center</span>
          <h1>${this._escape(NAV_ITEMS.find((item) => item.id === this._view)?.label || "Übersicht")}</h1>
        </div>
        <div class="topbar-actions">
          ${entries.length > 1 ? `
            <label class="entry-select">
              <ha-icon icon="mdi:office-building-outline"></ha-icon>
              <select data-field="entry">
                ${entries.map((item) => `<option value="${this._escape(item.entry_id)}" ${item.entry_id === this._payload.selected_entry_id ? "selected" : ""}>${this._escape(item.title)}</option>`).join("")}
              </select>
            </label>
          ` : `<div class="entry-label"><ha-icon icon="mdi:office-building-outline"></ha-icon><span>${this._escape(entry?.title || "Nicht eingerichtet")}</span></div>`}
          <div class="connection ${connected ? "online" : "offline"}">
            <span></span>${connected ? "Verbunden" : "Offline"}
          </div>
          <button class="icon-button ${this._refreshing ? "spinning" : ""}" data-action="refresh" title="Daten aktualisieren">
            <ha-icon icon="mdi:refresh"></ha-icon>
          </button>
        </div>
      </header>
      <div class="mobile-nav">
        ${NAV_ITEMS.map((item) => `
          <button class="${this._view === item.id ? "active" : ""}" data-action="navigate" data-view="${item.id}">
            <ha-icon icon="${item.icon}"></ha-icon><span>${item.label}</span>
          </button>
        `).join("")}
      </div>
    `;
  }

  _renderView() {
    if (!this._payload?.selected_entry_id) return this._renderNotConfigured();
    switch (this._view) {
      case "alarms": return this._renderAlarms();
      case "infrastructure": return this._renderInfrastructure();
      case "sensors": return this._renderSensors();
      case "grouplead": return this._renderGroupLead();
      case "mqtt": return this._renderMqtt();
      case "time_tracking": return this._renderTimeTracking();
      case "data": return this._renderAllData();
      case "api": return this._renderApiExplorer();
      default: return this._renderOverview();
    }
  }

  _renderNotConfigured() {
    return `
      <section class="empty-state card">
        <div class="empty-icon"><ha-icon icon="mdi:link-variant-off"></ha-icon></div>
        <h2>Noch keine FloriaX-Organisation eingerichtet</h2>
        <p>Öffne Geräte & Dienste und füge die FloriaX-Integration mit Server, Organisations-ID und API-Token hinzu.</p>
        <button class="button primary" data-action="open-config"><ha-icon icon="mdi:cog-outline"></ha-icon>Integrationen öffnen</button>
      </section>
    `;
  }

  _renderOverview() {
    const snapshot = this._snapshot();
    const errors = Object.keys(snapshot?.errors || {}).length;
    const activeAlarms = this._activeCount("alarm_events");
    const stats = [
      { label: "Aktive Alarme", value: activeAlarms, icon: "mdi:alarm-light", tone: activeAlarms ? "danger" : "success", view: "alarms" },
      { label: "Gateways", value: this._count("gateways"), icon: "mdi:access-point-network", tone: "blue", view: "infrastructure" },
      { label: "Buttons", value: this._count("buttons"), icon: "mdi:radiobox-marked", tone: "violet", view: "infrastructure" },
      { label: "Umweltsensoren", value: this._count("environment_sensors"), icon: "mdi:thermometer-lines", tone: "cyan", view: "sensors" },
      { label: "Schnellaktionen", value: this._count("grouplead_quick_actions"), icon: "mdi:lightning-bolt-circle", tone: "amber", view: "alarms" },
      { label: "Personen", value: this._count("grouplead_people"), icon: "mdi:account-group-outline", tone: "green", view: "grouplead" },
      { label: "Fahrzeuge", value: this._count("grouplead_vehicles"), icon: "mdi:fire-truck", tone: "red", view: "grouplead" },
      { label: "Einsätze", value: this._count("grouplead_incidents"), icon: "mdi:clipboard-text-clock-outline", tone: "slate", view: "grouplead" },
    ];

    return `
      <section class="hero">
        <div>
          <span class="eyebrow">Live-Lagebild</span>
          <h2>Alle FloriaX-Daten an einem Ort.</h2>
          <p>${snapshot?.successful_resources || 0} von ${snapshot?.total_resources || 0} API-Bereichen wurden automatisch geladen. Letzte Aktualisierung ${this._relativeTime(snapshot?.fetched_at)}.</p>
        </div>
        <div class="hero-status ${errors ? "warning" : "ok"}">
          <ha-icon icon="${errors ? "mdi:cloud-alert-outline" : "mdi:cloud-check-outline"}"></ha-icon>
          <div><strong>${errors ? `${errors} Bereiche eingeschränkt` : "Alle Bereiche erreichbar"}</strong><span>${errors ? "Berechtigungen oder Endpunkte prüfen" : "Datensynchronisierung aktiv"}</span></div>
        </div>
      </section>
      <section class="stat-grid">
        ${stats.map((stat) => `
          <button class="stat-card ${stat.tone}" data-action="navigate" data-view="${stat.view}">
            <span class="stat-icon"><ha-icon icon="${stat.icon}"></ha-icon></span>
            <span class="stat-value">${stat.value}</span>
            <span class="stat-label">${stat.label}</span>
            <ha-icon class="stat-arrow" icon="mdi:arrow-top-right"></ha-icon>
          </button>
        `).join("")}
      </section>
      <section class="dashboard-grid">
        <div class="card span-2">
          <div class="card-header">
            <div><span class="eyebrow">Alarmierung</span><h3>Schnellaktionen</h3></div>
            <button class="text-button" data-action="navigate" data-view="alarms">Alle anzeigen <ha-icon icon="mdi:arrow-right"></ha-icon></button>
          </div>
          ${this._renderQuickActions(6)}
        </div>
        <div class="card">
          <div class="card-header"><div><span class="eyebrow">System</span><h3>API-Abdeckung</h3></div></div>
          ${this._renderCoverage()}
        </div>
        <div class="card span-2">
          <div class="card-header">
            <div><span class="eyebrow">Aktivität</span><h3>Letzte Alarmereignisse</h3></div>
            <button class="text-button" data-action="navigate" data-view="alarms">Alle anzeigen <ha-icon icon="mdi:arrow-right"></ha-icon></button>
          </div>
          ${this._renderCollection("alarm_events", 6, true)}
        </div>
        <div class="card">
          <div class="card-header"><div><span class="eyebrow">Bestand</span><h3>Datenverteilung</h3></div></div>
          ${this._renderDistribution()}
        </div>
      </section>
    `;
  }

  _renderCoverage() {
    const snapshot = this._snapshot();
    const success = snapshot?.successful_resources || 0;
    const total = snapshot?.total_resources || 0;
    const percent = total ? Math.round((success / total) * 100) : 0;
    const errors = snapshot?.errors || {};
    return `
      <div class="coverage">
        <div class="donut" style="--progress:${percent * 3.6}deg"><span>${percent}%</span></div>
        <div class="coverage-copy"><strong>${success}/${total}</strong><span>Bereiche erfolgreich</span></div>
      </div>
      ${Object.keys(errors).length ? `
        <div class="mini-list">
          ${Object.values(errors).slice(0, 4).map((error) => `<div><span class="dot warning"></span><strong>${this._escape(error.title)}</strong><em>${this._escape(error.status || "Fehler")}</em></div>`).join("")}
        </div>
      ` : `<div class="success-box"><ha-icon icon="mdi:check-decagram-outline"></ha-icon><span>Keine API-Fehler erkannt</span></div>`}
    `;
  }

  _renderDistribution() {
    const values = [
      ["Gateways", this._count("gateways")],
      ["Buttons", this._count("buttons")],
      ["Sensoren", this._count("environment_sensors")],
      ["Personen", this._count("grouplead_people")],
      ["Fahrzeuge", this._count("grouplead_vehicles")],
      ["Teams", this._count("grouplead_teams")],
    ];
    const max = Math.max(1, ...values.map((entry) => entry[1]));
    return `<div class="bar-chart">${values.map(([label, value]) => `
      <div class="bar-row"><span>${label}</span><div><i style="width:${Math.max(4, (value / max) * 100)}%"></i></div><strong>${value}</strong></div>
    `).join("")}</div>`;
  }

  _renderAlarms() {
    return `
      <section class="section-heading">
        <div><span class="eyebrow">Alarmierung</span><h2>Alarme und Schnellaktionen</h2><p>Aktuelle Alarmereignisse, Ziele, Einstellungen und direkte Auslösung.</p></div>
        <div class="heading-badge danger"><ha-icon icon="mdi:alarm-light"></ha-icon><strong>${this._activeCount("alarm_events")}</strong><span>aktiv</span></div>
      </section>
      <section class="card prominent">
        <div class="card-header"><div><span class="eyebrow">Direktauslösung</span><h3>Schnellaktionen</h3></div><span class="security-chip"><ha-icon icon="mdi:shield-check-outline"></ha-icon>Mit Bestätigung</span></div>
        ${this._renderQuickActions()}
      </section>
      <section class="dashboard-grid two">
        <div class="card span-2">
          <div class="card-header"><div><span class="eyebrow">Historie</span><h3>Alarm-Ereignisse</h3></div><span class="count-chip">${this._count("alarm_events")}</span></div>
          ${this._renderCollection("alarm_events", 100, true)}
        </div>
        ${this._renderObjectCard("alarm_settings")}
        ${this._renderResourceCard("alarm_targets")}
      </section>
    `;
  }

  _renderInfrastructure() {
    return `
      ${this._sectionHeading("Infrastruktur", "Gateways, Gruppen und Hardware-Buttons", "mdi:access-point-network", this._count("gateways") + this._count("buttons"), "Geräte")}
      <section class="dashboard-grid two">
        ${this._renderListCard("gateways", 100)}
        ${this._renderListCard("buttons", 100)}
        ${this._renderListCard("gateway_groups", 100)}
      </section>
    `;
  }

  _renderSensors() {
    return `
      ${this._sectionHeading("Sensorik", "Umweltsensoren und Things-Entitäten", "mdi:thermometer-lines", this._count("environment_sensors"), "Sensoren")}
      <section class="dashboard-grid two">
        ${this._renderListCard("environment_sensors", 100)}
        ${this._renderListCard("things_entities", 100)}
      </section>
    `;
  }

  _renderGroupLead() {
    return `
      ${this._sectionHeading("GroupLead", "Personal, Tags, Fahrzeuge, Teams und Einsatzführung", "mdi:account-group-outline", this._count("grouplead_people"), "Personen")}
      <section class="stat-grid compact">
        ${[
          ["Personen", "grouplead_people", "mdi:account-group-outline", "green"],
          ["Tags", "grouplead_tags", "mdi:tag-multiple-outline", "violet"],
          ["Fahrzeuge", "grouplead_vehicles", "mdi:fire-truck", "red"],
          ["Teams", "grouplead_teams", "mdi:account-multiple-outline", "blue"],
          ["Einsätze", "grouplead_incidents", "mdi:clipboard-text-clock-outline", "amber"],
          ["Kartenobjekte", "grouplead_map_objects", "mdi:map-marker-multiple-outline", "cyan"],
        ].map(([label, key, icon, tone]) => `
          <button class="stat-card ${tone}" data-action="open-resource" data-resource="${key}"><span class="stat-icon"><ha-icon icon="${icon}"></ha-icon></span><span class="stat-value">${this._count(key)}</span><span class="stat-label">${label}</span></button>
        `).join("")}
      </section>
      <section class="dashboard-grid two">
        ${this._renderPeopleCard()}
        ${this._renderListCard("grouplead_vehicles", 100)}
        ${this._renderListCard("grouplead_teams", 100)}
        ${this._renderListCard("grouplead_tags", 100)}
        ${this._renderListCard("grouplead_incidents", 100)}
        ${this._renderListCard("grouplead_map_objects", 100)}
        ${this._renderListCard("grouplead_changes", 100)}
      </section>
    `;
  }

  _renderMqtt() {
    return `
      ${this._sectionHeading("MQTT", "Verbindungen, Broker und Benutzer", "mdi:connection", this._count("mqtt_connections"), "Verbindungen")}
      <section class="dashboard-grid two">
        ${this._renderListCard("mqtt_connections", 100)}
        ${this._renderObjectCard("hosted_mqtt_broker")}
        ${this._renderListCard("hosted_mqtt_users", 100)}
      </section>
    `;
  }

  _renderTimeTracking() {
    return `
      ${this._sectionHeading("Zeiterfassung", "Sessions und Einsatzzuordnungen", "mdi:timer-outline", this._count("time_tracking_sessions"), "Sessions")}
      <section class="dashboard-grid two">
        ${this._renderListCard("time_tracking_sessions", 100)}
        ${this._renderListCard("time_tracking_incidents", 100)}
      </section>
    `;
  }

  _sectionHeading(eyebrow, title, icon, value, label) {
    return `
      <section class="section-heading">
        <div><span class="eyebrow">${eyebrow}</span><h2>${title}</h2><p>Alle verfügbaren Daten werden automatisch aus der FloriaX API synchronisiert.</p></div>
        <div class="heading-badge"><ha-icon icon="${icon}"></ha-icon><strong>${value}</strong><span>${label}</span></div>
      </section>
    `;
  }

  _renderPeopleCard() {
    const key = "grouplead_people";
    const resource = this._resource(key);
    const items = this._filteredItems(key);
    return `
      <div class="card span-2">
        <div class="card-header"><div><span class="eyebrow">GroupLead</span><h3>${this._escape(resource?.title || "Personen")}</h3></div><span class="count-chip">${items.length}</span></div>
        ${this._resourceError(resource)}
        ${items.length ? `<div class="people-grid">${items.map((item, index) => {
          const name = this._name(item, "Person");
          const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
          return `<button class="person-card" data-action="open-item" data-resource="${key}" data-index="${this._items(key).indexOf(item)}"><span class="avatar">${this._escape(initials || "FX")}</span><span><strong>${this._escape(name)}</strong><em>${this._escape(this._primitiveSummary(item, 2))}</em></span><ha-icon icon="mdi:chevron-right"></ha-icon></button>`;
        }).join("")}</div>` : this._emptyCollection()}
      </div>
    `;
  }

  _renderQuickActions(limit = 100) {
    const resource = this._resource("grouplead_quick_actions");
    const items = this._items("grouplead_quick_actions").slice(0, limit);
    if (resource?.status === "error") return this._resourceError(resource);
    if (!items.length) return `<div class="empty-inline"><ha-icon icon="mdi:lightning-bolt-outline"></ha-icon><span>Keine Schnellaktionen vorhanden</span></div>`;
    const canTrigger = Boolean(this._payload?.can_trigger_quick_actions);
    return `
      <div class="quick-actions">
        ${items.map((item, index) => `
          <button class="quick-action" data-action="quick-action" data-index="${index}" ${canTrigger ? "" : "disabled"}>
            <span class="quick-icon"><ha-icon icon="${this._escape(item.icon || item.mdiIcon || "mdi:alarm-light-outline")}"></ha-icon></span>
            <span class="quick-copy"><strong>${this._escape(this._name(item, "Schnellaktion"))}</strong><em>${this._escape(item.description || item.message || "Alarmaktion auslösen")}</em></span>
            <span class="quick-trigger"><ha-icon icon="${canTrigger ? "mdi:gesture-tap-button" : "mdi:lock-outline"}"></ha-icon>${canTrigger ? "Auslösen" : "Gesperrt"}</span>
          </button>
        `).join("")}
      </div>
    `;
  }

  _filteredItems(key) {
    const query = this._search.trim().toLowerCase();
    const items = this._items(key);
    if (!query) return items;
    return items.filter((item) => JSON.stringify(item).toLowerCase().includes(query));
  }

  _renderListCard(key, limit = 20) {
    const resource = this._resource(key);
    return `
      <div class="card ${["gateways", "buttons", "environment_sensors", "things_entities", "grouplead_incidents"].includes(key) ? "span-2" : ""}">
        <div class="card-header">
          <div><span class="eyebrow">${this._escape(this._humanize(resource?.section || "Daten"))}</span><h3>${this._escape(resource?.title || this._humanize(key))}</h3></div>
          <button class="count-chip clickable" data-action="open-resource" data-resource="${key}">${this._count(key)}</button>
        </div>
        ${this._renderCollection(key, limit)}
      </div>
    `;
  }

  _renderResourceCard(key) {
    const resource = this._resource(key);
    return `
      <div class="card">
        <div class="card-header"><div><span class="eyebrow">Daten</span><h3>${this._escape(resource?.title || this._humanize(key))}</h3></div><button class="count-chip clickable" data-action="open-resource" data-resource="${key}">${this._count(key)}</button></div>
        ${this._renderCollection(key, 10)}
      </div>
    `;
  }

  _renderObjectCard(key) {
    const resource = this._resource(key);
    return `
      <div class="card">
        <div class="card-header"><div><span class="eyebrow">Konfiguration</span><h3>${this._escape(resource?.title || this._humanize(key))}</h3></div><button class="icon-button small" data-action="open-resource" data-resource="${key}"><ha-icon icon="mdi:code-json"></ha-icon></button></div>
        ${this._resourceError(resource)}
        ${resource?.status === "ok" ? this._renderKeyValues(resource.data) : ""}
      </div>
    `;
  }

  _renderKeyValues(value) {
    if (value === null || value === undefined) return this._emptyCollection();
    if (typeof value !== "object") return `<div class="single-value">${this._escape(value)}</div>`;
    const entries = Object.entries(value).slice(0, 12);
    if (!entries.length) return this._emptyCollection();
    return `<div class="key-values">${entries.map(([key, item]) => `
      <div><span>${this._escape(this._humanize(key))}</span><strong>${this._escape(typeof item === "object" ? (Array.isArray(item) ? `${item.length} Einträge` : "Objekt") : item)}</strong></div>
    `).join("")}</div>`;
  }

  _renderCollection(key, limit = 20, emphasizeStatus = false) {
    const resource = this._resource(key);
    if (!resource) return this._emptyCollection("Noch nicht geladen");
    if (resource.status === "error") return this._resourceError(resource);
    const allItems = this._filteredItems(key);
    const items = allItems.slice(0, limit);
    if (!items.length) return this._emptyCollection();
    const related = RELATED_ACTIONS[key];
    return `
      <div class="record-list">
        ${items.map((item) => {
          const originalIndex = this._items(key).indexOf(item);
          const active = this._isActive(item);
          const timestamp = this._findTimestamp(item);
          return `
            <div class="record-row ${emphasizeStatus && active ? "record-active" : ""}">
              <button class="record-main" data-action="open-item" data-resource="${key}" data-index="${originalIndex}">
                <span class="status-dot ${active ? "active" : "inactive"}"></span>
                <span class="record-copy">
                  <strong>${this._escape(this._name(item, resource.title || "Eintrag"))}</strong>
                  <em>${this._escape(this._primitiveSummary(item))}</em>
                </span>
                ${timestamp ? `<time title="${this._escape(this._formatDate(timestamp))}">${this._escape(this._relativeTime(timestamp))}</time>` : ""}
                <ha-icon icon="mdi:chevron-right"></ha-icon>
              </button>
              ${related && this._id(item, related.idKeys) ? `<button class="row-action" data-action="load-related" data-resource="${key}" data-index="${originalIndex}" title="${related.label}"><ha-icon icon="${related.icon}"></ha-icon><span>${related.label}</span></button>` : ""}
            </div>
          `;
        }).join("")}
      </div>
      ${allItems.length > limit ? `<button class="show-all" data-action="open-resource" data-resource="${key}">${allItems.length - limit} weitere Einträge als JSON öffnen</button>` : ""}
    `;
  }

  _resourceError(resource) {
    if (!resource || resource.status !== "error") return "";
    return `<div class="resource-error"><ha-icon icon="mdi:lock-alert-outline"></ha-icon><div><strong>${this._escape(resource.http_status || "Fehler")}</strong><span>${this._escape(resource.error || "Bereich nicht verfügbar")}</span></div></div>`;
  }

  _emptyCollection(message = "Keine Einträge vorhanden") {
    return `<div class="empty-inline"><ha-icon icon="mdi:tray"></ha-icon><span>${this._escape(message)}</span></div>`;
  }

  _renderAllData() {
    const resources = Object.values(this._resources());
    const query = this._resourceFilter.trim().toLowerCase();
    const filtered = resources.filter((resource) => !query || `${resource.title} ${resource.key} ${resource.section}`.toLowerCase().includes(query));
    return `
      <section class="section-heading">
        <div><span class="eyebrow">Rohdaten</span><h2>Alle automatisch geladenen API-Bereiche</h2><p>Jeder Bereich kann vollständig als JSON geöffnet werden.</p></div>
        <label class="search-box"><ha-icon icon="mdi:magnify"></ha-icon><input data-field="resource-filter" value="${this._escape(this._resourceFilter)}" placeholder="Bereiche durchsuchen"></label>
      </section>
      <section class="resource-grid">
        ${filtered.map((resource) => `
          <button class="resource-tile ${resource.status === "ok" ? "ok" : "failed"}" data-action="open-resource" data-resource="${resource.key}">
            <span class="resource-icon"><ha-icon icon="${resource.icon || "mdi:database-outline"}"></ha-icon></span>
            <span class="resource-copy"><strong>${this._escape(resource.title)}</strong><em>${this._escape(resource.path)}</em></span>
            <span class="resource-meta"><b>${resource.count || 0}</b><i>${resource.status === "ok" ? "geladen" : resource.http_status || "Fehler"}</i></span>
          </button>
        `).join("") || this._emptyCollection("Keine passenden Bereiche")}
      </section>
    `;
  }

  _renderApiExplorer() {
    const operations = this._payload?.operations || [];
    const query = this._apiFilter.trim().toLowerCase();
    const filtered = operations.filter((operation) => !query || `${operation.summary} ${operation.path} ${operation.method} ${(operation.tags || []).join(" ")}`.toLowerCase().includes(query));
    const selected = this._selectedOperationData();
    return `
      <section class="section-heading">
        <div><span class="eyebrow">Expertenmodus</span><h2>FloriaX API-Explorer</h2><p>Alle dokumentierten Operationen direkt über das geschützte Home-Assistant-Backend ausführen.</p></div>
        <div class="admin-chip ${this._payload?.is_admin ? "yes" : "no"}"><ha-icon icon="${this._payload?.is_admin ? "mdi:shield-account" : "mdi:eye-outline"}"></ha-icon>${this._payload?.is_admin ? "Administrator" : "Nur Lesen"}</div>
      </section>
      <section class="api-layout">
        <aside class="api-list card">
          <label class="search-box compact"><ha-icon icon="mdi:magnify"></ha-icon><input data-field="api-filter" value="${this._escape(this._apiFilter)}" placeholder="Operation suchen"></label>
          <div class="operation-scroll">
            ${filtered.map((operation) => `
              <button class="operation ${operation.service === this._selectedOperation ? "active" : ""}" data-action="select-operation" data-service="${this._escape(operation.service)}">
                <span class="method ${operation.method.toLowerCase()}">${operation.method}</span>
                <span><strong>${this._escape(operation.summary)}</strong><em>${this._escape(operation.path)}</em></span>
              </button>
            `).join("")}
          </div>
        </aside>
        <div class="api-console card">
          ${selected ? this._renderApiForm(selected) : this._emptyCollection("Keine Operation ausgewählt")}
        </div>
      </section>
    `;
  }

  _renderApiForm(operation) {
    const disabled = operation.requires_admin && !this._payload?.is_admin;
    const pathParams = (operation.path_params || []).filter((param) => param !== "orgId");
    return `
      <div class="api-head">
        <div><span class="method ${operation.method.toLowerCase()}">${operation.method}</span><span class="api-tag">${this._escape((operation.tags || ["API"])[0])}</span></div>
        <h3>${this._escape(operation.summary)}</h3>
        <code>${this._escape(operation.path)}</code>
      </div>
      ${disabled ? `<div class="banner warning"><ha-icon icon="mdi:shield-lock-outline"></ha-icon><span>Diese schreibende Operation ist nur für Home-Assistant-Administratoren verfügbar.</span></div>` : ""}
      <div class="form-grid">
        ${pathParams.map((param) => `
          <label class="field"><span>Pfadparameter · ${this._escape(param)}</span><input data-path-param="${this._escape(param)}" placeholder="${this._escape(param)}"></label>
        `).join("")}
        <label class="field full"><span>Query-Parameter als JSON</span><textarea data-field="api-query" spellcheck="false">${this._escape(this._apiQueryText)}</textarea><small>Beispiel: {"limit": 100, "offset": 0}</small></label>
        <label class="field full"><span>Request-Body als JSON</span><textarea data-field="api-body" spellcheck="false">${this._escape(this._apiBodyText)}</textarea><small>Die OpenAPI enthält keine Body-Schemas; verwende die vom Backend erwarteten Felder.</small></label>
      </div>
      <div class="api-actions">
        <button class="button primary" data-action="execute-api" ${disabled || this._apiRunning ? "disabled" : ""}>
          ${this._apiRunning ? `<span class="spinner small"></span>Wird ausgeführt` : `<ha-icon icon="mdi:play"></ha-icon>Operation ausführen`}
        </button>
      </div>
      ${this._apiResult ? `
        <div class="response-box">
          <div class="response-head"><strong>Antwort</strong><button class="text-button" data-action="copy-json" data-source="api-result"><ha-icon icon="mdi:content-copy"></ha-icon>Kopieren</button></div>
          ${this._renderChart(this._apiResult?.data)}
          <pre>${this._json(this._apiResult)}</pre>
        </div>
      ` : ""}
    `;
  }

  _renderChart(value) {
    const series = this._numericSeries(value);
    if (!series || series.values.length < 2) return "";
    const width = 720;
    const height = 180;
    const padding = 18;
    const min = Math.min(...series.values);
    const max = Math.max(...series.values);
    const range = max - min || 1;
    const points = series.values.map((item, index) => {
      const x = padding + (index / Math.max(1, series.values.length - 1)) * (width - padding * 2);
      const y = height - padding - ((item - min) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return `
      <div class="chart-box">
        <div class="chart-title"><span>${this._escape(this._humanize(series.key))}</span><strong>${this._escape(series.values.at(-1))}</strong></div>
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Messwertverlauf">
          <defs><linearGradient id="fxArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--fx-accent)" stop-opacity=".3"/><stop offset="100%" stop-color="var(--fx-accent)" stop-opacity="0"/></linearGradient></defs>
          <polyline class="chart-area" points="${padding},${height - padding} ${points} ${width - padding},${height - padding}"/>
          <polyline class="chart-line" points="${points}"/>
        </svg>
        <div class="chart-range"><span>${min}</span><span>${series.values.length} Werte</span><span>${max}</span></div>
      </div>
    `;
  }

  _numericSeries(value) {
    let items = null;
    if (Array.isArray(value)) items = value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const candidate of ["items", "data", "readings", "records", "entries", "results"]) {
        if (Array.isArray(value[candidate])) {
          items = value[candidate];
          break;
        }
      }
      if (!items) {
        for (const candidate of Object.values(value)) {
          if (Array.isArray(candidate)) {
            items = candidate;
            break;
          }
        }
      }
    }
    if (!items?.length || typeof items[0] !== "object") return null;
    const keys = Object.keys(items[0]).filter((key) => items.filter((item) => typeof item?.[key] === "number").length >= 2);
    const preferred = keys.find((key) => !/id|time|date|timestamp|sequence/i.test(key)) || keys[0];
    if (!preferred) return null;
    const values = items.map((item) => item?.[preferred]).filter((item) => typeof item === "number" && Number.isFinite(item));
    return values.length >= 2 ? { key: preferred, values: values.slice(-100) } : null;
  }

  _renderModal() {
    if (!this._modal) return "";
    let body = "";
    let footer = `<button class="button" data-action="close-modal">Schließen</button>`;
    if (this._modal.type === "loading") {
      body = `<div class="modal-state"><div class="spinner"></div><p>Daten werden geladen …</p></div>`;
      footer = "";
    } else if (this._modal.type === "error") {
      body = `<div class="modal-state error"><ha-icon icon="mdi:alert-circle-outline"></ha-icon><p>${this._escape(this._modal.subtitle)}</p></div>`;
    } else if (this._modal.type === "confirm-quick-action") {
      body = `
        <div class="confirm-panel">
          <span class="confirm-icon"><ha-icon icon="mdi:alarm-light"></ha-icon></span>
          <h3>${this._escape(this._modal.subtitle)}</h3>
          <p>Diese Aktion kann einen realen Alarm beziehungsweise einen Einsatz in FloriaX auslösen. Bitte bestätige die Auslösung bewusst.</p>
        </div>
      `;
      footer = `<button class="button" data-action="close-modal">Abbrechen</button><button class="button danger" data-action="confirm-quick-action"><ha-icon icon="mdi:alarm-light"></ha-icon>Jetzt auslösen</button>`;
    } else {
      body = `${this._modal.chart || ""}<div class="response-head"><strong>JSON-Daten</strong><button class="text-button" data-action="copy-json" data-source="modal"><ha-icon icon="mdi:content-copy"></ha-icon>Kopieren</button></div><pre>${this._json(this._modal.raw)}</pre>`;
    }
    return `
      <div class="modal-backdrop" data-action="close-modal">
        <section class="modal" role="dialog" aria-modal="true" aria-label="${this._escape(this._modal.title)}">
          <header><div><span class="eyebrow">FloriaX</span><h2>${this._escape(this._modal.title)}</h2><p>${this._escape(this._modal.subtitle || "")}</p></div><button class="icon-button" data-action="close-modal"><ha-icon icon="mdi:close"></ha-icon></button></header>
          <div class="modal-body">${body}</div>
          ${footer ? `<footer>${footer}</footer>` : ""}
        </section>
      </div>
    `;
  }

  _renderToast() {
    if (!this._toast) return "";
    return `<div class="toast ${this._toast.kind}"><ha-icon icon="${this._toast.kind === "error" ? "mdi:alert-circle-outline" : "mdi:check-circle-outline"}"></ha-icon><span>${this._escape(this._toast.message)}</span></div>`;
  }

  _styles() {
    return `
      <style>
        :host {
          --fx-accent: #e11d48;
          --fx-accent-2: #f43f5e;
          --fx-surface: var(--card-background-color, #ffffff);
          --fx-surface-2: color-mix(in srgb, var(--card-background-color, #fff) 92%, var(--primary-color, #03a9f4) 8%);
          --fx-border: color-mix(in srgb, var(--primary-text-color, #111827) 13%, transparent);
          --fx-muted: var(--secondary-text-color, #64748b);
          --fx-text: var(--primary-text-color, #111827);
          --fx-bg: var(--primary-background-color, #f3f5f8);
          --fx-shadow: 0 12px 40px rgba(15, 23, 42, .08);
          display: block;
          width: 100%;
          height: 100%;
          min-height: 100vh;
          color: var(--fx-text);
          background: var(--fx-bg);
          font-family: var(--paper-font-body1_-_font-family, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
          box-sizing: border-box;
        }
        *, *::before, *::after { box-sizing: border-box; }
        button, input, select, textarea { font: inherit; }
        button { color: inherit; }
        .app-shell { min-height: 100vh; display: grid; grid-template-columns: 260px minmax(0, 1fr); }
        .sidebar { position: sticky; top: 0; height: 100vh; padding: 22px 16px; background: color-mix(in srgb, var(--fx-surface) 96%, #020617 4%); border-right: 1px solid var(--fx-border); display: flex; flex-direction: column; gap: 24px; z-index: 5; }
        .brand { display: flex; align-items: center; gap: 12px; padding: 0 8px; }
        .brand-logo { width: 42px; height: 42px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 14px; color: white; background: linear-gradient(145deg, var(--fx-accent-2), #be123c); box-shadow: 0 8px 20px rgba(225, 29, 72, .28); }
        .brand-logo ha-icon { --mdc-icon-size: 25px; }
        .brand-logo.large { width: 72px; height: 72px; border-radius: 22px; }
        .brand-logo.large ha-icon { --mdc-icon-size: 38px; }
        .brand-logo.danger { background: linear-gradient(145deg, #ef4444, #991b1b); }
        .brand-copy { min-width: 0; display: grid; }
        .brand-copy strong { font-size: 20px; letter-spacing: -.02em; }
        .brand-copy span { color: var(--fx-muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        nav { display: grid; gap: 5px; }
        .nav-item { width: 100%; border: 0; background: transparent; display: grid; grid-template-columns: 28px 1fr auto; align-items: center; gap: 10px; padding: 11px 12px; border-radius: 12px; color: var(--fx-muted); cursor: pointer; text-align: left; transition: .18s ease; }
        .nav-item:hover { background: var(--fx-surface-2); color: var(--fx-text); }
        .nav-item.active { color: var(--fx-accent); background: color-mix(in srgb, var(--fx-accent) 10%, transparent); font-weight: 700; }
        .nav-item ha-icon { --mdc-icon-size: 21px; }
        .nav-item em { min-width: 26px; padding: 3px 7px; border-radius: 999px; background: var(--fx-surface-2); color: var(--fx-muted); text-align: center; font-size: 11px; font-style: normal; }
        .sidebar-footer { margin-top: auto; display: grid; gap: 12px; }
        .security-note { padding: 12px; border: 1px solid var(--fx-border); border-radius: 14px; display: flex; gap: 10px; align-items: center; background: var(--fx-surface-2); }
        .security-note ha-icon { color: #16a34a; }
        .security-note div { display: grid; }
        .security-note strong { font-size: 12px; }
        .security-note span { font-size: 10px; color: var(--fx-muted); }
        .version { color: var(--fx-muted); font-size: 10px; text-align: center; }
        .workspace { min-width: 0; }
        .topbar { position: sticky; top: 0; z-index: 4; min-height: 82px; padding: 14px clamp(18px, 3vw, 40px); background: color-mix(in srgb, var(--fx-bg) 86%, transparent); backdrop-filter: blur(18px); border-bottom: 1px solid var(--fx-border); display: flex; align-items: center; justify-content: space-between; gap: 18px; }
        .page-title { display: grid; gap: 2px; }
        .eyebrow { color: var(--fx-muted); font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
        h1, h2, h3, p { margin: 0; }
        .page-title h1 { font-size: 25px; letter-spacing: -.035em; }
        .topbar-actions { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .entry-label, .entry-select { height: 40px; max-width: 280px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid var(--fx-border); border-radius: 12px; background: var(--fx-surface); color: var(--fx-muted); }
        .entry-label span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .entry-label ha-icon, .entry-select ha-icon { --mdc-icon-size: 19px; }
        .entry-select select { min-width: 0; border: 0; outline: 0; color: var(--fx-text); background: transparent; }
        .connection { height: 40px; display: flex; align-items: center; gap: 7px; padding: 0 12px; border-radius: 12px; font-size: 12px; font-weight: 700; background: var(--fx-surface); border: 1px solid var(--fx-border); }
        .connection span { width: 8px; height: 8px; border-radius: 50%; }
        .connection.online span { background: #22c55e; box-shadow: 0 0 0 4px rgba(34,197,94,.13); }
        .connection.offline span { background: #ef4444; box-shadow: 0 0 0 4px rgba(239,68,68,.13); }
        .icon-button { width: 40px; height: 40px; border: 1px solid var(--fx-border); border-radius: 12px; background: var(--fx-surface); display: grid; place-items: center; cursor: pointer; }
        .icon-button:hover { background: var(--fx-surface-2); }
        .icon-button.small { width: 34px; height: 34px; border-radius: 10px; }
        .icon-button.spinning ha-icon { animation: spin 1s linear infinite; }
        .mobile-brand, .mobile-nav { display: none; }
        .content { padding: clamp(20px, 3vw, 40px); max-width: 1800px; margin: 0 auto; }
        .hero { padding: clamp(24px, 4vw, 44px); border-radius: 26px; color: white; background: radial-gradient(circle at 80% 10%, rgba(255,255,255,.16), transparent 28%), linear-gradient(135deg, #111827, #1e293b 56%, #881337); display: flex; align-items: center; justify-content: space-between; gap: 28px; box-shadow: var(--fx-shadow); overflow: hidden; }
        .hero > div:first-child { max-width: 780px; display: grid; gap: 10px; }
        .hero .eyebrow { color: rgba(255,255,255,.65); }
        .hero h2 { font-size: clamp(28px, 4vw, 48px); letter-spacing: -.045em; line-height: 1.05; }
        .hero p { max-width: 680px; color: rgba(255,255,255,.72); line-height: 1.6; }
        .hero-status { min-width: 240px; padding: 18px; border-radius: 18px; display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.12); backdrop-filter: blur(12px); }
        .hero-status ha-icon { --mdc-icon-size: 32px; }
        .hero-status.ok ha-icon { color: #4ade80; }
        .hero-status.warning ha-icon { color: #fbbf24; }
        .hero-status div { display: grid; gap: 3px; }
        .hero-status span { color: rgba(255,255,255,.68); font-size: 12px; }
        .stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin: 18px 0; }
        .stat-grid.compact { grid-template-columns: repeat(6, minmax(0, 1fr)); }
        .stat-card { position: relative; min-height: 142px; padding: 18px; border: 1px solid var(--fx-border); border-radius: 20px; background: var(--fx-surface); display: grid; grid-template-columns: 46px 1fr; grid-template-rows: auto auto; align-items: center; gap: 10px 12px; text-align: left; cursor: pointer; box-shadow: 0 8px 28px rgba(15,23,42,.045); overflow: hidden; transition: transform .18s ease, box-shadow .18s ease; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: var(--fx-shadow); }
        .stat-card::after { content: ""; position: absolute; width: 110px; height: 110px; border-radius: 50%; right: -50px; top: -50px; background: currentColor; opacity: .05; }
        .stat-icon { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 14px; background: color-mix(in srgb, currentColor 11%, transparent); grid-row: span 2; }
        .stat-value { font-size: 31px; line-height: 1; font-weight: 800; letter-spacing: -.04em; color: var(--fx-text); }
        .stat-label { align-self: start; color: var(--fx-muted); font-size: 12px; font-weight: 650; }
        .stat-arrow { position: absolute; right: 14px; bottom: 14px; opacity: .32; --mdc-icon-size: 18px; }
        .stat-card.danger, .stat-card.red { color: #e11d48; }
        .stat-card.success, .stat-card.green { color: #16a34a; }
        .stat-card.blue { color: #2563eb; }
        .stat-card.violet { color: #7c3aed; }
        .stat-card.cyan { color: #0891b2; }
        .stat-card.amber { color: #d97706; }
        .stat-card.slate { color: #475569; }
        .dashboard-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
        .dashboard-grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .span-2 { grid-column: span 2; }
        .card { min-width: 0; padding: 20px; border: 1px solid var(--fx-border); border-radius: 20px; background: var(--fx-surface); box-shadow: 0 8px 30px rgba(15,23,42,.045); }
        .card.prominent { margin: 18px 0; border-color: color-mix(in srgb, var(--fx-accent) 24%, var(--fx-border)); }
        .card-header { min-height: 42px; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 16px; }
        .card-header > div { display: grid; gap: 4px; }
        .card-header h3 { font-size: 18px; letter-spacing: -.025em; }
        .text-button { border: 0; background: transparent; color: var(--fx-accent); display: inline-flex; align-items: center; gap: 5px; cursor: pointer; font-size: 12px; font-weight: 700; }
        .text-button ha-icon { --mdc-icon-size: 17px; }
        .count-chip, .security-chip, .admin-chip { border: 0; padding: 6px 10px; border-radius: 999px; background: var(--fx-surface-2); color: var(--fx-muted); font-size: 11px; font-weight: 800; font-style: normal; }
        .count-chip.clickable { cursor: pointer; }
        .security-chip { display: flex; gap: 5px; align-items: center; color: #16a34a; }
        .security-chip ha-icon { --mdc-icon-size: 15px; }
        .coverage { display: flex; align-items: center; gap: 18px; padding: 8px 0 18px; }
        .donut { width: 90px; height: 90px; border-radius: 50%; background: conic-gradient(var(--fx-accent) var(--progress), var(--fx-border) 0); display: grid; place-items: center; position: relative; }
        .donut::after { content: ""; position: absolute; inset: 9px; border-radius: 50%; background: var(--fx-surface); }
        .donut span { z-index: 1; font-size: 20px; font-weight: 850; }
        .coverage-copy { display: grid; }
        .coverage-copy strong { font-size: 28px; }
        .coverage-copy span { color: var(--fx-muted); font-size: 12px; }
        .mini-list { display: grid; gap: 8px; }
        .mini-list > div { display: grid; grid-template-columns: 12px 1fr auto; align-items: center; gap: 8px; font-size: 11px; }
        .mini-list em { color: var(--fx-muted); font-style: normal; }
        .dot, .status-dot { width: 8px; height: 8px; border-radius: 50%; }
        .dot.warning { background: #f59e0b; }
        .success-box { padding: 11px; border-radius: 12px; color: #15803d; background: rgba(34,197,94,.09); display: flex; gap: 8px; align-items: center; font-size: 12px; font-weight: 700; }
        .bar-chart { display: grid; gap: 13px; }
        .bar-row { display: grid; grid-template-columns: 75px 1fr 28px; gap: 8px; align-items: center; font-size: 11px; }
        .bar-row > div { height: 8px; border-radius: 999px; background: var(--fx-surface-2); overflow: hidden; }
        .bar-row i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--fx-accent), #fb7185); }
        .bar-row strong { text-align: right; }
        .quick-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .quick-action { min-width: 0; padding: 14px; border: 1px solid var(--fx-border); border-radius: 16px; background: var(--fx-surface-2); display: grid; grid-template-columns: 42px minmax(0, 1fr) auto; align-items: center; gap: 12px; text-align: left; cursor: pointer; transition: .18s ease; }
        .quick-action:hover { border-color: color-mix(in srgb, var(--fx-accent) 42%, var(--fx-border)); transform: translateY(-1px); }
        .quick-icon { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 13px; color: white; background: linear-gradient(145deg, var(--fx-accent-2), #be123c); }
        .quick-copy { min-width: 0; display: grid; gap: 2px; }
        .quick-copy strong, .quick-copy em { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .quick-copy em { color: var(--fx-muted); font-size: 11px; font-style: normal; }
        .quick-trigger { display: flex; align-items: center; gap: 4px; color: var(--fx-accent); font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
        .quick-trigger ha-icon { --mdc-icon-size: 17px; }
        .record-list { display: grid; }
        .record-row { border-top: 1px solid var(--fx-border); display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; }
        .record-row:first-child { border-top: 0; }
        .record-active { background: linear-gradient(90deg, rgba(225,29,72,.055), transparent); }
        .record-main { min-width: 0; padding: 12px 5px; border: 0; background: transparent; display: grid; grid-template-columns: 10px minmax(0,1fr) auto 20px; gap: 10px; align-items: center; text-align: left; cursor: pointer; }
        .record-main:hover .record-copy strong { color: var(--fx-accent); }
        .status-dot.active { background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.12); }
        .record-active .status-dot.active { background: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,.12); }
        .status-dot.inactive { background: #94a3b8; }
        .record-copy { min-width: 0; display: grid; gap: 3px; }
        .record-copy strong, .record-copy em { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .record-copy strong { font-size: 13px; }
        .record-copy em { color: var(--fx-muted); font-size: 10px; font-style: normal; }
        .record-main time { color: var(--fx-muted); font-size: 10px; }
        .record-main > ha-icon { color: var(--fx-muted); --mdc-icon-size: 18px; }
        .row-action { margin-left: 8px; padding: 7px 9px; border: 1px solid var(--fx-border); border-radius: 9px; background: transparent; color: var(--fx-muted); display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 10px; }
        .row-action:hover { color: var(--fx-accent); border-color: color-mix(in srgb, var(--fx-accent) 35%, var(--fx-border)); }
        .row-action ha-icon { --mdc-icon-size: 16px; }
        .show-all { width: 100%; margin-top: 10px; padding: 9px; border: 0; border-radius: 10px; background: var(--fx-surface-2); color: var(--fx-accent); cursor: pointer; font-size: 11px; font-weight: 700; }
        .empty-inline { min-height: 110px; display: grid; place-items: center; align-content: center; gap: 8px; color: var(--fx-muted); text-align: center; }
        .empty-inline ha-icon { --mdc-icon-size: 28px; opacity: .55; }
        .resource-error { min-height: 110px; padding: 14px; border-radius: 14px; color: #b91c1c; background: rgba(239,68,68,.08); display: flex; align-items: center; gap: 12px; }
        .resource-error ha-icon { --mdc-icon-size: 27px; }
        .resource-error div { min-width: 0; display: grid; gap: 3px; }
        .resource-error span { color: var(--fx-muted); font-size: 10px; overflow-wrap: anywhere; }
        .section-heading { min-height: 120px; margin-bottom: 18px; padding: 4px 0; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
        .section-heading > div:first-child { display: grid; gap: 8px; }
        .section-heading h2 { font-size: clamp(27px, 3vw, 40px); letter-spacing: -.045em; }
        .section-heading p { color: var(--fx-muted); }
        .heading-badge { min-width: 132px; padding: 16px; border: 1px solid var(--fx-border); border-radius: 18px; background: var(--fx-surface); display: grid; grid-template-columns: 36px 1fr; gap: 2px 10px; align-items: center; }
        .heading-badge ha-icon { grid-row: span 2; color: var(--fx-accent); --mdc-icon-size: 30px; }
        .heading-badge strong { font-size: 24px; line-height: 1; }
        .heading-badge span { color: var(--fx-muted); font-size: 10px; }
        .heading-badge.danger { color: #e11d48; }
        .people-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 9px; }
        .person-card { min-width: 0; padding: 10px; border: 1px solid var(--fx-border); border-radius: 14px; background: var(--fx-surface-2); display: grid; grid-template-columns: 40px minmax(0,1fr) 20px; align-items: center; gap: 10px; text-align: left; cursor: pointer; }
        .avatar { width: 40px; height: 40px; border-radius: 13px; display: grid; place-items: center; color: #fff; background: linear-gradient(145deg, #475569, #1e293b); font-size: 12px; font-weight: 850; }
        .person-card > span:nth-child(2) { min-width: 0; display: grid; gap: 3px; }
        .person-card strong, .person-card em { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .person-card em { color: var(--fx-muted); font-size: 10px; font-style: normal; }
        .person-card ha-icon { color: var(--fx-muted); --mdc-icon-size: 17px; }
        .key-values { display: grid; }
        .key-values > div { padding: 9px 2px; border-top: 1px solid var(--fx-border); display: flex; justify-content: space-between; gap: 12px; font-size: 11px; }
        .key-values > div:first-child { border-top: 0; }
        .key-values span { color: var(--fx-muted); }
        .key-values strong { max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .single-value { padding: 28px 0; font-size: 30px; font-weight: 800; }
        .search-box { min-width: min(360px, 100%); height: 44px; padding: 0 13px; border: 1px solid var(--fx-border); border-radius: 13px; background: var(--fx-surface); display: flex; align-items: center; gap: 8px; }
        .search-box.compact { min-width: 0; height: 40px; }
        .search-box ha-icon { color: var(--fx-muted); --mdc-icon-size: 19px; }
        .search-box input { width: 100%; border: 0; outline: 0; background: transparent; color: var(--fx-text); }
        .resource-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 14px; }
        .resource-tile { min-width: 0; min-height: 105px; padding: 15px; border: 1px solid var(--fx-border); border-radius: 17px; background: var(--fx-surface); display: grid; grid-template-columns: 44px minmax(0,1fr) auto; align-items: center; gap: 12px; text-align: left; cursor: pointer; transition: .18s ease; }
        .resource-tile:hover { transform: translateY(-2px); box-shadow: var(--fx-shadow); }
        .resource-tile.failed { border-color: rgba(239,68,68,.25); }
        .resource-icon { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 13px; color: #2563eb; background: rgba(37,99,235,.1); }
        .resource-tile.failed .resource-icon { color: #dc2626; background: rgba(239,68,68,.1); }
        .resource-copy { min-width: 0; display: grid; gap: 4px; }
        .resource-copy strong, .resource-copy em { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .resource-copy em { color: var(--fx-muted); font-size: 9px; font-style: normal; }
        .resource-meta { display: grid; justify-items: end; }
        .resource-meta b { font-size: 20px; }
        .resource-meta i { color: var(--fx-muted); font-size: 9px; font-style: normal; }
        .api-layout { display: grid; grid-template-columns: 390px minmax(0,1fr); gap: 18px; align-items: start; }
        .api-list { position: sticky; top: 102px; padding: 14px; }
        .operation-scroll { max-height: calc(100vh - 190px); margin-top: 12px; overflow: auto; display: grid; gap: 4px; }
        .operation { width: 100%; min-width: 0; padding: 9px; border: 0; border-radius: 11px; background: transparent; display: grid; grid-template-columns: 54px minmax(0,1fr); gap: 9px; align-items: center; text-align: left; cursor: pointer; }
        .operation:hover, .operation.active { background: var(--fx-surface-2); }
        .operation.active { box-shadow: inset 3px 0 var(--fx-accent); }
        .operation > span:last-child { min-width: 0; display: grid; gap: 2px; }
        .operation strong, .operation em { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .operation strong { font-size: 11px; }
        .operation em { color: var(--fx-muted); font-size: 8px; font-style: normal; }
        .method { display: inline-grid; place-items: center; min-width: 50px; height: 24px; padding: 0 7px; border-radius: 7px; font-size: 9px; font-weight: 900; letter-spacing: .05em; }
        .method.get { color: #0369a1; background: rgba(14,165,233,.12); }
        .method.post { color: #15803d; background: rgba(34,197,94,.12); }
        .method.put { color: #a16207; background: rgba(234,179,8,.14); }
        .method.patch { color: #7e22ce; background: rgba(168,85,247,.12); }
        .method.delete { color: #b91c1c; background: rgba(239,68,68,.12); }
        .api-console { min-height: 560px; }
        .api-head { display: grid; gap: 9px; padding-bottom: 18px; border-bottom: 1px solid var(--fx-border); }
        .api-head > div { display: flex; gap: 8px; }
        .api-head h3 { font-size: 24px; letter-spacing: -.03em; }
        .api-head code { padding: 10px 12px; border-radius: 10px; background: var(--fx-surface-2); color: var(--fx-muted); overflow-wrap: anywhere; font-size: 11px; }
        .api-tag { display: inline-flex; align-items: center; padding: 0 9px; border-radius: 7px; background: var(--fx-surface-2); color: var(--fx-muted); font-size: 9px; font-weight: 700; }
        .form-grid { margin-top: 18px; display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px; }
        .field { display: grid; gap: 7px; }
        .field.full { grid-column: 1/-1; }
        .field > span { font-size: 11px; font-weight: 750; }
        .field input, .field textarea { width: 100%; border: 1px solid var(--fx-border); border-radius: 11px; outline: 0; background: var(--fx-surface-2); color: var(--fx-text); }
        .field input { height: 42px; padding: 0 11px; }
        .field textarea { min-height: 125px; padding: 11px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; line-height: 1.5; }
        .field input:focus, .field textarea:focus { border-color: color-mix(in srgb, var(--fx-accent) 55%, var(--fx-border)); box-shadow: 0 0 0 3px rgba(225,29,72,.08); }
        .field small { color: var(--fx-muted); font-size: 9px; }
        .api-actions { margin-top: 16px; display: flex; justify-content: flex-end; }
        .button { min-height: 40px; padding: 0 15px; border: 1px solid var(--fx-border); border-radius: 11px; background: var(--fx-surface); display: inline-flex; align-items: center; justify-content: center; gap: 7px; cursor: pointer; font-weight: 750; font-size: 12px; }
        .button:hover { background: var(--fx-surface-2); }
        .button.primary { color: white; border-color: transparent; background: linear-gradient(145deg, var(--fx-accent-2), #be123c); }
        .button.danger { color: white; border-color: transparent; background: #dc2626; }
        .button:disabled { opacity: .5; cursor: not-allowed; }
        .response-box { margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--fx-border); }
        .response-head { min-height: 38px; display: flex; justify-content: space-between; align-items: center; }
        pre { max-height: 55vh; margin: 0; padding: 16px; border: 1px solid var(--fx-border); border-radius: 13px; background: color-mix(in srgb, var(--fx-surface-2) 84%, #020617 16%); color: var(--fx-text); overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; line-height: 1.55; }
        .admin-chip { display: flex; align-items: center; gap: 6px; }
        .admin-chip.yes { color: #15803d; }
        .admin-chip.no { color: #a16207; }
        .banner { margin-bottom: 15px; padding: 12px 14px; border-radius: 12px; display: flex; align-items: center; gap: 9px; font-size: 12px; }
        .banner.error { color: #b91c1c; background: rgba(239,68,68,.1); }
        .banner.warning { color: #a16207; background: rgba(245,158,11,.1); }
        .chart-box { margin-bottom: 16px; padding: 14px; border: 1px solid var(--fx-border); border-radius: 14px; background: var(--fx-surface-2); }
        .chart-title { display: flex; justify-content: space-between; align-items: center; font-size: 11px; }
        .chart-title strong { font-size: 20px; }
        .chart-box svg { width: 100%; height: 170px; margin-top: 8px; overflow: visible; }
        .chart-line { fill: none; stroke: var(--fx-accent); stroke-width: 3; vector-effect: non-scaling-stroke; }
        .chart-area { fill: url(#fxArea); stroke: none; }
        .chart-range { display: flex; justify-content: space-between; color: var(--fx-muted); font-size: 9px; }
        .modal-backdrop { position: fixed; inset: 0; z-index: 100; padding: 20px; display: grid; place-items: center; background: rgba(2,6,23,.58); backdrop-filter: blur(8px); }
        .modal { width: min(880px, 100%); max-height: min(88vh, 920px); border: 1px solid var(--fx-border); border-radius: 24px; background: var(--fx-surface); box-shadow: 0 30px 100px rgba(2,6,23,.35); display: grid; grid-template-rows: auto minmax(0,1fr) auto; overflow: hidden; }
        .modal > header { padding: 20px 22px; border-bottom: 1px solid var(--fx-border); display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; }
        .modal > header > div { display: grid; gap: 4px; }
        .modal > header h2 { font-size: 24px; letter-spacing: -.035em; }
        .modal > header p { color: var(--fx-muted); font-size: 11px; overflow-wrap: anywhere; }
        .modal-body { min-height: 180px; padding: 20px 22px; overflow: auto; }
        .modal > footer { padding: 14px 22px; border-top: 1px solid var(--fx-border); display: flex; justify-content: flex-end; gap: 10px; }
        .modal-state { min-height: 260px; display: grid; place-items: center; align-content: center; gap: 12px; color: var(--fx-muted); }
        .modal-state.error ha-icon { color: #dc2626; --mdc-icon-size: 44px; }
        .confirm-panel { min-height: 300px; max-width: 520px; margin: auto; display: grid; place-items: center; align-content: center; gap: 14px; text-align: center; }
        .confirm-icon { width: 82px; height: 82px; border-radius: 26px; color: white; background: linear-gradient(145deg, #f43f5e, #be123c); display: grid; place-items: center; box-shadow: 0 14px 34px rgba(225,29,72,.27); }
        .confirm-icon ha-icon { --mdc-icon-size: 42px; }
        .confirm-panel h3 { font-size: 25px; }
        .confirm-panel p { color: var(--fx-muted); line-height: 1.6; }
        .toast { position: fixed; z-index: 110; right: 24px; bottom: 24px; max-width: min(420px, calc(100vw - 48px)); padding: 13px 16px; border-radius: 14px; color: white; background: #166534; display: flex; align-items: center; gap: 9px; box-shadow: 0 18px 50px rgba(2,6,23,.25); animation: toast-in .2s ease; }
        .toast.error { background: #b91c1c; }
        .center-state { min-height: 100vh; padding: 30px; display: grid; place-items: center; align-content: center; gap: 14px; text-align: center; }
        .center-state h1 { font-size: 30px; }
        .center-state p { max-width: 580px; color: var(--fx-muted); }
        .spinner { width: 32px; height: 32px; border: 3px solid var(--fx-border); border-top-color: var(--fx-accent); border-radius: 50%; animation: spin .8s linear infinite; }
        .spinner.small { width: 16px; height: 16px; border-width: 2px; }
        .empty-state { max-width: 720px; margin: 10vh auto; padding: 60px 30px; display: grid; justify-items: center; gap: 14px; text-align: center; }
        .empty-state p { max-width: 520px; color: var(--fx-muted); line-height: 1.55; }
        .empty-icon { width: 70px; height: 70px; border-radius: 22px; display: grid; place-items: center; color: var(--fx-accent); background: rgba(225,29,72,.1); }
        .empty-icon ha-icon { --mdc-icon-size: 36px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes toast-in { from { opacity: 0; transform: translateY(8px); } }
        @media (max-width: 1280px) {
          .stat-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .stat-grid.compact { grid-template-columns: repeat(3, minmax(0,1fr)); }
          .resource-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .people-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .dashboard-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
        @media (max-width: 900px) {
          .app-shell { display: block; }
          .sidebar { display: none; }
          .topbar { min-height: 70px; padding: 10px 14px; }
          .page-title { display: none; }
          .mobile-brand { display: flex; align-items: center; gap: 9px; }
          .mobile-brand .brand-logo { width: 36px; height: 36px; border-radius: 11px; }
          .mobile-brand .brand-logo ha-icon { --mdc-icon-size: 21px; }
          .entry-label { display: none; }
          .connection { padding: 0 9px; font-size: 0; }
          .connection span { margin: 0; }
          .mobile-nav { position: sticky; top: 70px; z-index: 3; display: flex; gap: 4px; padding: 7px 10px; border-bottom: 1px solid var(--fx-border); background: color-mix(in srgb, var(--fx-bg) 90%, transparent); backdrop-filter: blur(16px); overflow-x: auto; }
          .mobile-nav button { flex: 0 0 auto; min-width: 66px; padding: 7px 9px; border: 0; border-radius: 10px; background: transparent; color: var(--fx-muted); display: grid; place-items: center; gap: 3px; font-size: 9px; }
          .mobile-nav button.active { color: var(--fx-accent); background: rgba(225,29,72,.09); }
          .mobile-nav ha-icon { --mdc-icon-size: 20px; }
          .content { padding: 18px 12px 40px; }
          .hero { align-items: flex-start; flex-direction: column; }
          .hero-status { width: 100%; }
          .dashboard-grid, .dashboard-grid.two { grid-template-columns: 1fr; }
          .span-2 { grid-column: auto; }
          .quick-actions { grid-template-columns: 1fr; }
          .section-heading { align-items: flex-start; flex-direction: column; }
          .heading-badge { min-width: 0; width: 100%; }
          .search-box { width: 100%; min-width: 0; }
          .api-layout { grid-template-columns: 1fr; }
          .api-list { position: static; }
          .operation-scroll { max-height: 340px; }
          .resource-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 620px) {
          .stat-grid, .stat-grid.compact { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .stat-card { min-height: 118px; padding: 14px; grid-template-columns: 40px 1fr; }
          .stat-icon { width: 40px; height: 40px; border-radius: 12px; }
          .stat-value { font-size: 26px; }
          .hero { padding: 24px 20px; border-radius: 20px; }
          .card { padding: 16px; border-radius: 17px; }
          .people-grid { grid-template-columns: 1fr; }
          .record-row { grid-template-columns: 1fr; }
          .row-action { margin: 0 0 8px 28px; width: fit-content; }
          .quick-action { grid-template-columns: 40px minmax(0,1fr); }
          .quick-trigger { grid-column: 2; }
          .form-grid { grid-template-columns: 1fr; }
          .field.full { grid-column: auto; }
          .modal-backdrop { padding: 0; align-items: end; }
          .modal { width: 100%; max-height: 94vh; border-radius: 22px 22px 0 0; }
          .toast { right: 12px; bottom: 12px; max-width: calc(100vw - 24px); }
        }
      </style>
    `;
  }
}

if (!customElements.get("floriax-panel")) {
  customElements.define("floriax-panel", FloriaXPanel);
}
