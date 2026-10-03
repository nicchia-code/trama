import * as vscode from "vscode";
import { questionFailure, type QuestionHandler } from "../../../src/core/questions";
import type { Project } from "../../../src/core/store";
import { callTool, TOOLS } from "../../../src/tools/catalog";

/**
 * Registers the Trama tools with VS Code's language-model tool API, so the agent in the editor's chat (Copilot)
 * calls them directly: no CLI on PATH, and no tool exists for the developer's decisions. Their names and schemas
 * are declared in package.json (`contributes.languageModelTools`), generated from the same catalog by the build.
 */
export function registerTramaTools(project: () => Project | undefined, questionHandler: QuestionHandler): vscode.Disposable {
  return vscode.Disposable.from(
    ...TOOLS.map((tool) =>
      vscode.lm.registerTool<Record<string, unknown>>(tool.name, {
        prepareInvocation: () => ({ invocationMessage: `Trama: ${tool.title.toLowerCase()}` }),
        invoke: async (options, token) => {
          const controller = new AbortController();
          const cancellation = token.onCancellationRequested(() => controller.abort());
          if (token.isCancellationRequested) controller.abort();
          try {
            const p = project();
            const outcome = p ? await callTool(p, tool.name, options.input, { questionHandler, context: { agent: "Copilot", signal: controller.signal } }) : { text: tool.name === "trama_ask" ? JSON.stringify(questionFailure(new Error("This workspace has no Trama project (.trama/)."))) : "This workspace has no Trama project (.trama/). Ask the developer to run Trama: Initialize Project.", isError: true };
            return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(tool.name === "trama_ask" || !outcome.isError ? outcome.text : `Error: ${outcome.text}`)]);
          } finally {
            cancellation.dispose();
          }
        },
      }),
    ),
  );
}
