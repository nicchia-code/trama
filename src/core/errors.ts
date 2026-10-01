/** A failure the user can act on (exit code 1). */
export class TramaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TramaError";
  }
}

/** Bad command line (exit code 2). */
export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}
