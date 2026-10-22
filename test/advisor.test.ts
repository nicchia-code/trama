import { expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { run, countsAsActivity } from "../src/cli/main";
import { ADVISOR_INSTRUCTIONS } from "../src/core/advisors";
import { terminalEnv } from "../extension/src/host/terminal-agent";

const ON = "The Advisor Scanner is on for this session.";

test("advisor show says yes only when TRAMA_ADVISOR_SCANNER is 1, in Markdown and in JSON, and always exits 0", () => {
  const show = (env: Record<string, string | undefined>, json = false) => run(["advisor", "show", ...(json ? ["--json"] : [])], tmpdir(), env);
  expect(show({ TRAMA_ADVISOR_SCANNER: "1" })).toEqual({ out: ON, exit: 0 });
  expect(JSON.parse(show({ TRAMA_ADVISOR_SCANNER: "1" }, true).out)).toEqual({ advisorScanner: true });
  for (const env of [{}, { TRAMA_ADVISOR_SCANNER: "0" }, { TRAMA_ADVISOR_SCANNER: "true" }, { TRAMA_ADVISOR_SCANNER: "" }]) {
    const answer = show(env);
    expect(answer.exit).toBe(0);
    expect(answer.out).toContain("not on");
    expect(answer.out).toContain("stay silent");
    expect(JSON.parse(show(env, true).out)).toEqual({ advisorScanner: false });
  }
});

test("advisor show reads no project, takes no input and is not the agent's activity", () => {
  expect(run(["advisor", "show", "--root", "/nonexistent"], tmpdir(), { TRAMA_ADVISOR_SCANNER: "1" }).out).toBe(ON);
  expect(() => run(["advisor", "show", "extra"], tmpdir(), {})).toThrow("Usage: trama advisor show");
  expect(countsAsActivity(["advisor", "show"])).toBe(false);
  expect(run(["--help"], "/nonexistent").out).toMatch(/advisor\s+show/);
});

test("the terminal of a Run with the Advisor Scanner on carries TRAMA_ADVISOR_SCANNER=1 and any other terminal does not", () => {
  const withOverlay = terminalEnv("/sock", "abc123", "job1", true);
  expect(withOverlay).toEqual({ TRAMA_AGENT: "1", TRAMA_QUESTION_ENDPOINT: "/sock", TRAMA_TERMINAL: "abc123", TRAMA_JOB: "job1", TRAMA_ADVISOR_SCANNER: "1" });
  const without = terminalEnv("/sock", "abc123", "job1");
  expect(without).toEqual({ TRAMA_AGENT: "1", TRAMA_QUESTION_ENDPOINT: "/sock", TRAMA_TERMINAL: "abc123", TRAMA_JOB: "job1" });
  expect("TRAMA_ADVISOR_SCANNER" in terminalEnv("/sock", "abc123")).toBe(false);
});

test("the advisor instructions start from trama advisor show and no longer name the sentence as the condition", () => {
  expect(ADVISOR_INSTRUCTIONS).toContain("`trama advisor show`");
  expect(ADVISOR_INSTRUCTIONS).not.toContain("contains the sentence");
  expect(ADVISOR_INSTRUCTIONS).toContain("`trama task list`");
});
