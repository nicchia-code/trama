import pkg from "../../package.json" with { type: "json" };

/** The version shown by the MCP server and the CLI. */
export const VERSION: string = pkg.version;
