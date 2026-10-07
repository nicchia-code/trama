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
