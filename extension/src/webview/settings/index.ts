import { settingValueError, type SettingSchema, type SettingsValues, type SettingValue } from "../../host/settings-schema";
import type { ToWebview } from "../../protocol";
import { renderInline, renderMarkdown } from "../markdown";
import type { View, ViewContext } from "../types";
import { effectiveValue, groupSettings, numberFromText, workspaceOverride } from "./logic";
import css from "./settings.css" with { type: "text" };
type SettingsMessage = Extract<ToWebview, { type: "settings" }>;

/** The Settings tab takes the host's settings message directly: it is not driven by snapshots. */
export interface SettingsView extends View {
  receive(message: SettingsMessage): void;
}

/** How long the bubble stays open after the pointer leaves the «i» or the bubble, so the pointer can cross the gap. */
const CLOSE_DELAY_MS = 150;

/** One entry of an enum's bubble: the value, its entry, and the mark that shows it is the chosen one. */
interface EnumEntry {
  value: string;
  item: HTMLLIElement;
  mark: HTMLElement;
}

interface Field {
  id: string;
  setting: SettingSchema;
  control: HTMLSelectElement | HTMLInputElement;
  /** The «i» that opens the explanation bubble. */
  info: HTMLButtonElement;
  /** The explanation bubble: hidden until the «i» is hovered or focused, or the bubble itself is focused. */
  bubble: HTMLElement;
  /** Enum only: one entry per value, the chosen one marked. */
  entries: EnumEntry[];
  error: HTMLElement;
  workspace: HTMLElement;
  /** Typed but not yet sent: a message from the host does not overwrite it. */
  dirty: boolean;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** The Settings tab: every Trama setting the manifest declares, in groups, each saved to the user settings when the developer confirms it. */
export const mountSettings = (root: HTMLElement, context: ViewContext): SettingsView => {
  const style = document.createElement("style");
  style.textContent = css;
  root.append(style);

  const page = el("div", "st");
  root.append(page);

  const fields = new Map<string, Field>();
  /** The schema the form was built for; the form is rebuilt only if the manifest's schema changes. */
  let built = "";
  /** The only bubble open at a time, and the timer that closes it after the pointer leaves. */
  let shown: Field | null = null;
  let closeTimer: number | undefined;

  const send = (key: string, value: SettingValue) => context.post({ type: "setSetting", key, value });

  function showBubble(field: Field) {
    clearTimeout(closeTimer);
    if (shown === field) return;
    if (shown !== null) hideBubble(shown);
    shown = field;
    field.bubble.hidden = false;
    field.info.setAttribute("aria-expanded", "true");
  }

  function hideBubble(field: Field) {
    if (shown === field) {
      shown = null;
      clearTimeout(closeTimer);
    }
    field.bubble.hidden = true;
    field.info.setAttribute("aria-expanded", "false");
  }

  function scheduleHide(field: Field) {
    clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => hideBubble(field), CLOSE_DELAY_MS);
  }

  function showError(field: Field, reason: string | null) {
    field.error.hidden = reason === null;
    field.error.textContent = reason ?? "";
    if (reason === null) field.control.removeAttribute("aria-invalid");
    else field.control.setAttribute("aria-invalid", "true");
  }

  /** The explanation and, for an enum, the chosen value's entry are described to screen readers even while the bubble is closed. */
  function describe(field: Field, chosen: string | undefined) {
    const ids = [`${field.id}-explain`];
    const entry = field.entries.find((candidate) => candidate.value === chosen);
    if (entry !== undefined) ids.push(entry.item.id);
    ids.push(`${field.id}-error`);
    field.control.setAttribute("aria-describedby", ids.join(" "));
  }

  function markValue(field: Field, value: string) {
    for (const entry of field.entries) {
      const chosen = entry.value === value;
      entry.item.classList.toggle("st-tip-current", chosen);
      entry.mark.textContent = chosen ? " (current)" : "";
    }
    describe(field, value);
  }

  function enumControl(field: Field): HTMLSelectElement {
    const select = el("select", "st-select");
    select.id = field.id;
    for (const value of field.setting.values ?? []) select.append(new Option(value, value));
    select.addEventListener("change", () => {
      send(field.setting.key, select.value);
      markValue(field, select.value);
    });
    return select;
  }

  function booleanControl(field: Field): HTMLInputElement {
    const box = el("input");
    box.type = "checkbox";
    box.id = field.id;
    box.addEventListener("change", () => send(field.setting.key, box.checked));
    return box;
  }

  /** A whole number or a text, sent on `change` (leaving the field or Enter); an invalid number is shown, not sent. */
  function inputControl(field: Field): HTMLInputElement {
    const { setting } = field;
    const input = el("input", "st-input");
    input.id = field.id;
    input.type = setting.control === "integer" ? "number" : "text";
    if (setting.control === "integer") {
      if (setting.minimum !== undefined) input.min = String(setting.minimum);
      input.step = "1";
    }
    input.addEventListener("input", () => {
      field.dirty = true;
    });
    input.addEventListener("change", () => {
      if (setting.control !== "integer") {
        field.dirty = false;
        send(setting.key, input.value);
        return;
      }
      const value = numberFromText(input.value);
      const reason = settingValueError(setting, value);
      showError(field, reason);
      if (reason !== null) return;
      field.dirty = false;
      send(setting.key, value);
    });
    return input;
  }

  function settingNode(setting: SettingSchema): HTMLElement {
    const id = `st-${setting.key.replace(/\./g, "-")}`;
    const explain = renderMarkdown(setting.markdown, context.openLink);
    explain.id = `${id}-explain`;

    const entries: EnumEntry[] = (setting.values ?? []).map((value, index) => {
      const item = el("li", "st-tip-value");
      item.id = `${id}-value-${index}`;
      const mark = el("span", "st-tip-mark");
      item.append(el("code", "st-code", value), " ", renderInline(setting.descriptions?.[index] ?? "", context.openLink), mark);
      return { value, item, mark };
    });

    const bubble = el("div", "st-tip");
    bubble.id = `${id}-tip`;
    bubble.setAttribute("role", "tooltip");
    bubble.tabIndex = -1;
    bubble.hidden = true;
    bubble.append(explain);
    if (entries.length > 0) {
      const list = el("ul", "st-tip-values");
      list.append(...entries.map((entry) => entry.item));
      bubble.append(list);
    }

    const info = el("button", "st-info", "i");
    info.type = "button";
    info.id = `${id}-info`;
    info.title = `About ${setting.title}`;
    info.setAttribute("aria-label", `About ${setting.title}`);
    info.setAttribute("aria-expanded", "false");
    info.setAttribute("aria-controls", bubble.id);

    const error = el("p", "st-error");
    error.id = `${id}-error`;
    error.hidden = true;
    const workspace = el("p", "st-workspace");
    workspace.hidden = true;

    const field: Field = { id, setting, control: el("input"), info, bubble, entries, error, workspace, dirty: false };
    field.control = setting.control === "enum"
      ? enumControl(field)
      : setting.control === "boolean"
        ? booleanControl(field)
        : inputControl(field);
    field.control.classList.add("st-control");
    describe(field, undefined);

    // The «i» and the bubble form one hover and focus area: the bubble opens on entry, closes after a short pause on leave,
    // closes when focus leaves the area, and Esc closes it and keeps the focus on the «i».
    const tipWrap = el("span", "st-tipwrap");
    tipWrap.append(info, bubble);
    let dismissed = false;
    tipWrap.addEventListener("pointerenter", () => showBubble(field));
    tipWrap.addEventListener("pointerleave", () => scheduleHide(field));
    tipWrap.addEventListener("focusin", () => {
      if (!dismissed) showBubble(field);
    });
    tipWrap.addEventListener("focusout", (event) => {
      if (!tipWrap.contains(event.relatedTarget as Node | null)) hideBubble(field);
    });
    tipWrap.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || bubble.hidden) return;
      hideBubble(field);
      dismissed = true;
      info.focus();
      dismissed = false;
    });

    const title = el("label", "st-title", setting.title);
    title.htmlFor = id;
    const head = el("div", "st-head");
    head.append(title, tipWrap);
    fields.set(setting.key, field);

    const node = el("div", "st-setting");
    node.append(head, field.control, error, workspace);
    return node;
  }

  function build(schema: SettingSchema[]) {
    fields.clear();
    shown = null;
    clearTimeout(closeTimer);
    page.replaceChildren(
      ...groupSettings(schema).map((group) => {
        const section = el("section", "st-group");
        const settings = el("div", "st-settings");
        settings.append(...group.settings.map(settingNode));
        section.append(el("h2", "st-group-title", group.title), settings);
        return section;
      }),
    );
  }

  /** Shows the developer's value (the default when none is set); an invalid number the developer typed is left as typed. */
  function apply(field: Field, values: SettingsValues | undefined) {
    const { setting, control } = field;
    if (setting.control === "text") {
      const input = control as HTMLInputElement;
      input.value = typeof values?.user === "string" ? values.user : "";
      input.placeholder = typeof setting.default === "string" ? setting.default : "";
    } else if (setting.control === "boolean") {
      (control as HTMLInputElement).checked = effectiveValue(setting, values) === true;
    } else if (setting.control === "integer") {
      (control as HTMLInputElement).value = String(effectiveValue(setting, values));
      showError(field, null);
    } else {
      const value = String(effectiveValue(setting, values));
      (control as HTMLSelectElement).value = value;
      markValue(field, value);
    }
  }

  return {
    update() {
      // The settings do not depend on the snapshot: the host sends them on their own.
    },
    show() {
      // Nothing to reset: the tab keeps what the developer typed.
    },
    receive(message) {
      const schema = JSON.stringify(message.schema);
      if (schema !== built) {
        build(message.schema);
        built = schema;
      }
      for (const field of fields.values()) {
        const values = message.values[field.setting.key];
        if (!field.dirty) apply(field, values);
        const override = workspaceOverride(field.setting, values);
        field.workspace.hidden = override === null;
        field.workspace.replaceChildren();
        if (override !== null) field.workspace.append("The workspace setting overrides this: ", el("code", "st-code", override), ".");
      }
    },
  };
};
