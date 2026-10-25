/** One model provider omp can log in to with a subscription: `id` is the one `omp login <id>` takes and the `provider` of the models it then lists. */
export interface OmpLoginProvider {
  id: string;
  /** The short name: the row's title and the terminal's name. */
  name: string;
  /** The subscription the login is for, shown under the name. */
  plan: string;
  /** Only for the providers the name alone does not tell apart: the tooltip on the name and the button. */
  description?: string;
  /** Only for the provider that takes an API key Trama saves and passes to omp (Cursor): its row offers Set/Change/Remove API key. */
  apiKey?: true;
}

/** The providers of the Providers section, in order. A fixed list, not read from omp: no other provider has a Log in button. */
export const OMP_LOGIN_PROVIDERS: readonly OmpLoginProvider[] = [
  { id: "openai-codex", name: "ChatGPT", plan: "Plus/Pro (Codex)" },
  { id: "anthropic", name: "Anthropic", plan: "Claude Pro/Max" },
  { id: "github-copilot", name: "GitHub Copilot", plan: "Copilot subscription" },
  { id: "google-gemini-cli", name: "Google Gemini CLI", plan: "Cloud Code Assist", description: "Gemini models through Google Cloud Code Assist, the Gemini CLI login." },
  { id: "google-antigravity", name: "Google Antigravity", plan: "Gemini, Claude, GPT-OSS", description: "Gemini, Claude and GPT-OSS models through Google's Antigravity login." },
  { id: "cursor", name: "Cursor", plan: "Cursor subscription or API key", apiKey: true },
  { id: "xai-oauth", name: "xAI Grok", plan: "SuperGrok or X Premium+" },
];

/** The provider of `OMP_LOGIN_PROVIDERS` with this `id`, or undefined for any other text. */
export const ompLoginProvider = (id: string): OmpLoginProvider | undefined => OMP_LOGIN_PROVIDERS.find((provider) => provider.id === id);

/** Whether omp gives models of `provider`, from `providers` of the last answer (`ompStatus` or `agentCheck`): undefined when `providers` is absent, which is an unknown state. */
export const providerConnected = (providers: readonly string[] | undefined, provider: string): boolean | undefined => (providers === undefined ? undefined : providers.includes(provider));

/** What the Providers section shows: null when there is no section, else the providers `omp models --json` lists (absent: their states are unknown). */
export type ProvidersView = { connected: readonly string[] | undefined } | null;

/**
 * The section after an answer of omp: it appears only with an outcome where omp answers (`answers`), carrying that outcome's `providers`; an outcome where omp does not answer
 * removes it; while a check is `pending` it keeps what it had, so the rows keep their states until the new outcome arrives.
 */
export function providersView(previous: ProvidersView, outcome: "pending" | { answers: boolean; providers?: readonly string[] | undefined }): ProvidersView {
  if (outcome === "pending") return previous;
  return outcome.answers ? { connected: outcome.providers } : null;
}
