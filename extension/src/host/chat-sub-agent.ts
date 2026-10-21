import { join } from "node:path";
import { SUB_AGENTS } from "../../../src/core/sub-agents";

/**
 * The user definition of one of Trama's sub-agents that Cursor's chat reads, `~/.cursor/agents/<name>.md`. An empty `scan`
 * model makes Cursor inherit the chat's model.
 */
export function chatSubAgentFile(name: keyof typeof SUB_AGENTS, scan: string, home: string): { path: string; contents: string } {
  const { description, prompt } = SUB_AGENTS[name];
  const model = scan === "" ? "inherit" : JSON.stringify(scan);
  return {
    path: join(home, ".cursor", "agents", `${name}.md`),
    contents: `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\nmodel: ${model}\n---\n\n${prompt}\n`,
  };
}

/** Both definitions Trama installs for Cursor's chat. */
export const chatSubAgentFiles = (scan: string, home: string): { path: string; contents: string }[] =>
  (Object.keys(SUB_AGENTS) as (keyof typeof SUB_AGENTS)[]).map((name) => chatSubAgentFile(name, scan, home));
