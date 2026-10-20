// The `trama` executable. Kept apart from main.ts, which the extension bundles as a library.
import { TramaError, UsageError } from "../core/errors";
import { settleCoordinatorMessages } from "../core/question-channel";
import { questionAborted } from "../core/questions";
import { completeFixChoice } from "./fix-prompt";
import { execute, modeOf, reportActivity } from "./main";

const write = (text: string) => new Promise<void>((resolve) => process.stdout.write(text, () => resolve()));

try {
  const argv = process.argv.slice(2);
  const mode = modeOf(argv);

  // A command that waits for the editor is cancelled by a signal, or by the closing of its output; whoever reads its
  // standard input stops reading then too.
  const controller = new AbortController();
  let outputConnected = true;
  const interrupt = () => controller.abort();
  const disconnect = () => { outputConnected = false; controller.abort(); };
  const stopReading = () => process.stdin.destroy(questionAborted());
  if (mode === "blocking") {
    process.on("SIGINT", interrupt);
    process.on("SIGTERM", interrupt);
    process.stdout.on("close", disconnect);
    process.stdout.on("error", disconnect);
    controller.signal.addEventListener("abort", stopReading, { once: true });
  }
  const stdin = async () => {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    controller.signal.removeEventListener("abort", stopReading);
    return Buffer.concat(chunks).toString("utf8");
  };

  // Without a terminal there is nobody to ask: the command then refuses what it cannot decide.
  const interactive = process.stdin.isTTY && process.stdout.isTTY;
  const line = interactive ? await completeFixChoice(argv, process.cwd(), { input: process.stdin, output: process.stdout }) : argv;
  let outcome: { out: string; exit: number };
  try {
    outcome = await execute(line, process.cwd(), { signal: controller.signal, stdin });
  } finally {
    controller.signal.removeEventListener("abort", stopReading);
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", interrupt);
  }
  if (outputConnected && outcome.out !== "") await write(`${outcome.out}\n`);
  if (outcome.exit === 0 && mode !== "hook") await reportActivity(argv, process.cwd());
  await settleCoordinatorMessages();
  process.exit(outcome.exit);
} catch (err) {
  if (err instanceof UsageError || err instanceof TramaError) {
    console.error(`error: ${err.message}`);
    process.exit(err instanceof UsageError ? 2 : 1);
  }
  throw err;
}
