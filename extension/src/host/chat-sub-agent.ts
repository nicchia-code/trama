import { join } from "node:path";
import { SUB_AGENTS } from "../../../src/core/sub-agents";

/**
 * The user definition of trama-analysis that the active editor's chat reads: Cursor's `~/.cursor/agents/` or Copilot's
 * `~/.copilot/agents/`. An empty `scan` model makes Cursor inherit the chat's model and leaves Copilot without a model.
 */
export function chatSubAgentFile(cursor: boolean, scan: string, home: string): { path: string; contents: string } {
  const { description, prompt } = SUB_AGENTS["trama-analysis"];
  const yamlDescription = JSON.stringify(description);
  if (cursor) {
    const model = scan === "" ? "inherit" : JSON.stringify(scan);
    return {
      path: join(home, ".cursor", "agents", "trama-analysis.md"),
      contents: `---\nname: trama-analysis\ndescription: ${yamlDescription}\nmodel: ${model}\n---\n\n${prompt}\n`,
    };
  }
  const model = scan === "" ? "" : `model: ${JSON.stringify(scan)}\n`;
  return {
    path: join(home, ".copilot", "agents", "trama-analysis.agent.md"),
    contents: `---\nname: trama-analysis\ndescription: ${yamlDescription}\n${model}---\n\n${prompt}\n`,
  };
}
