import { join } from "node:path";
import { SUB_AGENTS } from "../../../src/core/sub-agents";

/**
 * The user definition of trama-analysis that Cursor's chat reads, `~/.cursor/agents/trama-analysis.md`. An empty `scan`
 * model makes Cursor inherit the chat's model.
 */
export function chatSubAgentFile(scan: string, home: string): { path: string; contents: string } {
  const { description, prompt } = SUB_AGENTS["trama-analysis"];
  const model = scan === "" ? "inherit" : JSON.stringify(scan);
  return {
    path: join(home, ".cursor", "agents", "trama-analysis.md"),
    contents: `---\nname: trama-analysis\ndescription: ${JSON.stringify(description)}\nmodel: ${model}\n---\n\n${prompt}\n`,
  };
}
