import type { Classification } from "../../../src/core/question-channel";

const JEV_URL = "https://api.typesafe.ai/v1/systemone";
const JEV_TIMEOUT_MS = 10_000;
/** A Machine is in conflict from this probability up: in doubt, the conflict wins. */
const CONFLICT_THRESHOLD = 0.2;
const JEV_INSTRUCTIONS =
  "The code described in the state does not do what the Model and the Requirements in the state say for this Machine: a State, Transition, Event or Requirement is missing, behaves differently or is contradicted.";

const JEV_CONCURRENCY = 4;
let running = 0;
const waiting: (() => void)[] = [];

/** Runs `call` once a slot is free: at most four calls to Jev at a time, the rest wait here in arrival order. */
async function inJevSlot<T>(call: () => Promise<T>): Promise<T> {
  if (running < JEV_CONCURRENCY) running++;
  else await new Promise<void>((start) => waiting.push(start));
  try {
    return await call();
  } finally {
    // The slot passes to the next waiting call without being freed.
    const next = waiting.shift();
    if (next) next();
    else running--;
  }
}

/** One call to Jev, at most four running at once, for at most 10 seconds once it runs. Every failure counts as a conflict, with one line on why. */
export function askJev(key: string, state: string, fetcher: typeof fetch = fetch): Promise<Classification> {
  return inJevSlot(() => callJev(key, state, fetcher));
}

async function callJev(key: string, state: string, fetcher: typeof fetch): Promise<Classification> {
  let response: Response;
  try {
    response = await fetcher(JEV_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "jev-latest", state, questions: { conflict: { type: "noul", instructions: JEV_INSTRUCTIONS } } }),
      signal: AbortSignal.timeout(JEV_TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return { answer: "conflict", reason: timedOut ? "Jev did not answer within 10 seconds." : `Jev could not be reached: ${err instanceof Error ? err.message : String(err)}` };
  }
  if (!response.ok) return { answer: "conflict", reason: `Jev answered HTTP ${response.status}.` };
  let probability: unknown;
  try {
    const body: unknown = await response.json();
    probability = body !== null && typeof body === "object" && "answers" in body ? noul(body.answers) : undefined;
  } catch {
    probability = undefined;
  }
  if (typeof probability !== "number" || Number.isNaN(probability)) return { answer: "conflict", reason: "Jev's answer has no answers.conflict.noul." };
  return { answer: probability >= CONFLICT_THRESHOLD ? "conflict" : "no-conflict" };
}

/** `answers.conflict.noul` of Jev's answer, read without trusting its shape. */
function noul(answers: unknown): unknown {
  if (answers === null || typeof answers !== "object" || !("conflict" in answers)) return undefined;
  const { conflict } = answers;
  return conflict !== null && typeof conflict === "object" && "noul" in conflict ? conflict.noul : undefined;
}
