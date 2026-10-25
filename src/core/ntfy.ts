// The settings of the away notifications (`tech#away-notifications`): when the ntfy server and topic are valid, and where notifications go for them. Pure and with no
// import, so the Settings tab of the panel, the host and the notifier share it without bringing anything else along.

/** The server an empty `trama.ntfyServer` stands for. */
export const DEFAULT_NTFY_SERVER = "https://ntfy.sh";

/** What the field of `trama.ntfyServer` says under an invalid value. */
export const NTFY_SERVER_ERROR = "Enter an http or https address without user name or password.";
/** What the field of `trama.ntfyTopic` says under an invalid value. */
export const NTFY_TOPIC_ERROR = "Use 1 to 64 letters, digits, - or _.";

const TOPIC_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * The URL requests go to for a server setting, or undefined when it is not valid: an absolute `http:` or `https:` URL, trimmed, without user name, password, query or
 * fragment. An empty server is the default.
 */
export function ntfyServerUrl(server: string): string | undefined {
  const text = server.trim() === "" ? DEFAULT_NTFY_SERVER : server.trim();
  if (!/^https?:\/\//i.test(text) || /[?#]/.test(text)) return undefined;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return undefined;
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.hostname === "" || url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") return undefined;
  return url.href;
}

/** Why `server` cannot be saved, or null when it is valid (an empty one is the default). */
export const ntfyServerError = (server: string): string | null => (ntfyServerUrl(server) === undefined ? NTFY_SERVER_ERROR : null);

/** Why `topic` cannot be saved, or null when it is valid. An empty topic means the notifications are off: it is not an error. */
export const ntfyTopicError = (topic: string): string | null => (topic.trim() === "" || TOPIC_PATTERN.test(topic.trim()) ? null : NTFY_TOPIC_ERROR);

/** Where notifications go now: nowhere (no topic), nowhere because a setting is not valid, or a server and a topic that are. */
export type NtfyTarget = { state: "off" } | { state: "invalid" } | { state: "ready"; url: string; topic: string };

/** The target the two settings (as read from the user settings: undefined when not set) stand for. Never throws. */
export function ntfyTarget(server: unknown, topic: unknown): NtfyTarget {
  if (topic === undefined || (typeof topic === "string" && topic.trim() === "")) return { state: "off" };
  if (typeof topic !== "string" || (server !== undefined && typeof server !== "string")) return { state: "invalid" };
  const url = ntfyServerUrl(server ?? "");
  if (url === undefined || !TOPIC_PATTERN.test(topic.trim())) return { state: "invalid" };
  return { state: "ready", url, topic: topic.trim() };
}
