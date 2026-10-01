// The `trama` executable. Kept apart from main.ts, which the extension bundles as a library.
import { TramaError, UsageError } from "../core/errors";
import { serveMcp } from "../tools/mcp";
import { makeContext } from "./commands";
import { mcpRoot, run } from "./main";
import { VERSION } from "./version";

try {
  const mcp = mcpRoot(process.argv.slice(2));
  if (mcp) {
    const context = makeContext(process.cwd(), mcp.root);
    await serveMcp(() => context.project(), VERSION);
    process.exit(0);
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
