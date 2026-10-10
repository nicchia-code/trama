// The `trama` executable. Kept apart from main.ts, which the extension bundles as a library.
import { TramaError, UsageError } from "../core/errors";
import { questionAborted, questionFailure } from "../core/questions";
import { completeFixChoice } from "./fix-prompt";
import { agentEventCommand, agentVariable, asyncCommand, classifyCommand, helpFor, reportActivity, run, runAgentEvent, runAsk, runClassify, runCursorHook } from "./main";

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
  if (agentEventCommand(argv) !== null) {
    await runAgentEvent(argv, process.cwd());
    process.exit(0);
  }
  if (classifyCommand(argv) !== null) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const { out, err, exit } = await runClassify(argv, process.cwd(), Buffer.concat(chunks).toString("utf8"));
    if (err !== undefined) console.error(err);
    if (out !== "") await new Promise<void>((resolve) => process.stdout.write(`${out}\n`, () => resolve()));
    if (exit === 0) await reportActivity(argv, process.cwd());
    process.exit(exit);
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
  // An agent never decides on a Drift, and without a terminal there is nobody to ask: `run` then refuses a fix without an option.
  const interactive = process.stdin.isTTY && process.stdout.isTTY && !agentVariable(process.env);
  const { out, exit } = run(interactive ? await completeFixChoice(argv, process.cwd(), { input: process.stdin, output: process.stdout }) : argv, process.cwd());
  console.log(out);
  if (exit === 0) await reportActivity(argv, process.cwd());
  process.exit(exit);
} catch (err) {
  if (err instanceof UsageError || err instanceof TramaError) {
    console.error(`error: ${err.message}`);
    process.exit(err instanceof UsageError ? 2 : 1);
  }
  throw err;
}
