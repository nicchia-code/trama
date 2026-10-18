// The `trama` executable. Kept apart from main.ts, which the extension bundles as a library.
import { TramaError, UsageError } from "../core/errors";
import { settleCoordinatorMessages } from "../core/question-channel";
import { questionAborted, questionFailure } from "../core/questions";
import { completeFixChoice } from "./fix-prompt";
import { agentEventCommand, asyncCommand, autopilotCommand, helpFor, questionToolDenial, reportActivity, run, runAgentEvent, runAsk, runAutopilot, runCopilotHook, runCursorHook } from "./main";

try {
  const argv = process.argv.slice(2);
  // `--help` after any command name only prints that command's usage: no stdin, no editor, nothing else.
  const helped = helpFor(argv);
  if (helped !== null) {
    await new Promise<void>((resolve) => process.stdout.write(`${helped}\n`, () => resolve()));
    process.exit(0);
  }
  if (argv.length === 1 && argv[0] === "cursor-hook") {
    // Run by Cursor on every prompt: whatever happens, answer it and exit with 0, writing nothing else.
    let out = "{}";
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      out = await runCursorHook(Buffer.concat(chunks).toString("utf8"));
    } catch { /* Cursor is answered all the same. */ }
    await new Promise<void>((resolve) => process.stdout.write(`${out}\n`, () => resolve()));
    process.exit(0);
  }
  if (argv.length === 1 && argv[0] === "copilot-hook") {
    // Run by VS Code on every prompt and turn end; whatever happens, answer and exit with 0.
    let out = "{}";
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      out = await runCopilotHook(Buffer.concat(chunks).toString("utf8"));
    } catch { /* Copilot is answered all the same. */ }
    await new Promise<void>((resolve) => process.stdout.write(`${out}\n`, () => resolve()));
    process.exit(0);
  }
  if (autopilotCommand(argv) !== null) {
    const { out, exit } = await runAutopilot(argv, process.cwd());
    await new Promise<void>((resolve) => process.stdout.write(`${out}\n`, () => resolve()));
    process.exit(exit);
  }
  if (argv.length === 2 && argv[0] === "agent-event" && argv[1] === "question-tool") {
    // Run by Claude Code before its own question tool: it refuses the tool, reads nothing and never contacts the editor.
    await new Promise<void>((resolve) => process.stdout.write(`${questionToolDenial()}\n`, () => resolve()));
    process.exit(0);
  }
  if (agentEventCommand(argv) !== null) {
    await runAgentEvent(argv, process.cwd());
    process.exit(0);
  }
  const selected = asyncCommand(argv);
  if (selected?.command === "ask") {
    const controller = new AbortController();
    let outputConnected = true;
    const interrupt = () => controller.abort();
    const disconnect = () => { outputConnected = false; controller.abort(); };
    process.on("SIGINT", interrupt);
    process.on("SIGTERM", interrupt);
    process.stdout.on("close", disconnect);
    process.stdout.on("error", disconnect);
    const stopReading = () => process.stdin.destroy(questionAborted());
    controller.signal.addEventListener("abort", stopReading, { once: true });
    let result: { out: string; exit: number };
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      controller.signal.removeEventListener("abort", stopReading);
      result = await runAsk(argv, process.cwd(), Buffer.concat(chunks).toString("utf8"), { signal: controller.signal });
    } catch (error) {
      result = { out: JSON.stringify(questionFailure(error)), exit: 1 };
    } finally {
      controller.signal.removeEventListener("abort", stopReading);
      process.off("SIGINT", interrupt);
      process.off("SIGTERM", interrupt);
    }
    if (outputConnected) {
      await new Promise<void>((resolve) => {
        process.stdout.write(`${result.out}\n`, () => resolve());
      });
    }
    process.exit(result.exit);
  }
  // Without a terminal there is nobody to ask: `run` then refuses a fix without an option.
  const interactive = process.stdin.isTTY && process.stdout.isTTY;
  const { out, exit } = run(interactive ? await completeFixChoice(argv, process.cwd(), { input: process.stdin, output: process.stdout }) : argv, process.cwd());
  console.log(out);
  if (exit === 0) await reportActivity(argv, process.cwd());
  await settleCoordinatorMessages();
  process.exit(exit);
} catch (err) {
  if (err instanceof UsageError || err instanceof TramaError) {
    console.error(`error: ${err.message}`);
    process.exit(err instanceof UsageError ? 2 : 1);
  }
  throw err;
}
