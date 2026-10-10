import { expect, test } from "bun:test";
import { askJev } from "../extension/src/host/jev";

/** A fetch that answers `status` with `body`, recording the request. */
const answering = (status: number, body: unknown, seen: { url?: string; init?: RequestInit } = {}): typeof fetch =>
  (async (url: string, init: RequestInit) => {
    Object.assign(seen, { url, init });
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  }) as unknown as typeof fetch;

test("Jev's probability decides from 0.2 up, and the request carries the key only in its header", async () => {
  const seen: { url?: string; init?: RequestInit } = {};
  expect(await askJev("k3y", "the state", answering(200, { answers: { conflict: { noul: 0.2 } } }, seen))).toEqual({ answer: "conflict" });
  expect(seen.url).toBe("https://api.typesafe.ai/v1/systemone");
  expect(new Headers(seen.init?.headers).get("Authorization")).toBe("Bearer k3y");
  const body = JSON.parse(String(seen.init?.body)) as { model: string; state: string; questions: { conflict: { type: string } } };
  expect([body.model, body.state, body.questions.conflict.type]).toEqual(["jev-latest", "the state", "noul"]);
  expect(String(seen.init?.body)).not.toContain("k3y");
  expect(await askJev("k", "s", answering(200, { answers: { conflict: { noul: 0.19 } } }))).toEqual({ answer: "no-conflict" });
});

test("every failure of Jev counts as a conflict with one line on why, never naming the key", async () => {
  const failures = [
    await askJev("k3y", "s", answering(503, "busy")),
    await askJev("k3y", "s", answering(200, { answers: {} })),
    await askJev("k3y", "s", answering(200, "not json")),
    await askJev("k3y", "s", (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch),
    await askJev("k3y", "s", (async () => { throw new DOMException("timed out", "TimeoutError"); }) as unknown as typeof fetch),
  ];
  expect(failures.map((f) => f.answer)).toEqual(["conflict", "conflict", "conflict", "conflict", "conflict"]);
  expect(failures.map((f) => f.reason)).toEqual([
    "Jev answered HTTP 503.",
    "Jev's answer has no answers.conflict.noul.",
    "Jev's answer has no answers.conflict.noul.",
    "Jev could not be reached: fetch failed",
    "Jev did not answer within 10 seconds.",
  ]);
});

test("at most four calls to Jev run at once; the rest start in arrival order as slots free", async () => {
  let inFlight = 0;
  let peak = 0;
  const started: number[] = [];
  const arrived = [1, 2, 3, 4, 5, 6].map(() => Promise.withResolvers<void>());
  const holds: { release: () => void }[] = [];
  const fetcher = (async (_url: string, init: RequestInit) => {
    const id = Number(JSON.parse(String(init.body)).state);
    started.push(id);
    inFlight++;
    peak = Math.max(peak, inFlight);
    const hold = Promise.withResolvers<void>();
    holds.push({ release: hold.resolve });
    arrived[id - 1]?.resolve();
    await hold.promise;
    inFlight--;
    return new Response(JSON.stringify({ answers: { conflict: { noul: 0 } } }), { status: 200 });
  }) as unknown as typeof fetch;
  const answers = [1, 2, 3, 4, 5, 6].map((id) => askJev("k", JSON.stringify(id), fetcher));
  await Promise.all(arrived.slice(0, 4).map((call) => call.promise));
  expect(started).toEqual([1, 2, 3, 4]);
  holds[0]?.release();
  await arrived[4]?.promise;
  expect(started).toEqual([1, 2, 3, 4, 5]);
  for (let i = 1; i < 6; i++) {
    await arrived[i]?.promise;
    holds[i]?.release();
  }
  expect(await Promise.all(answers)).toHaveLength(6);
  expect(started).toEqual([1, 2, 3, 4, 5, 6]);
  expect(peak).toBe(4);
});
