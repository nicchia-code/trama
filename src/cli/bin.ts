// The `trama` executable. Kept apart from main.ts, which the extension bundles as a library.
import { terminalFromEnv } from "../core/announcements";
import { TramaError, UsageError } from "../core/errors";
import { questionAborted, questionFailure } from "../core/questions";
import { serveMcp } from "../tools/mcp";
import { makeContext } from "./commands";
import { asyncCommand, run, runAsk } from "./main";
import { VERSION } from "./version";

try {
  const argv = process.argv.slice(2);
  const selected = asyncCommand(argv);
  if (selected?.command === "mcp") {
    const context = makeContext(process.cwd(), selected.root);
    await serveMcp(() => context.project(), VERSION, undefined, undefined, { terminal: terminalFromEnv(process.env) });
    process.exit(0);
  }
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
  const { out, exit } = run(process.argv.slice(2), process.cwd());
  console.log(out);
  process.exit(exit);
} catch (err) {
  if (err instanceof UsageError || err instanceof TramaError) {
    console.error(`error: ${err.message}`);
    process.exit(err instanceof UsageError ? 2 : 1);
  }
  throw err;
}
