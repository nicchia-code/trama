import { beforeEach, describe, expect, test } from "bun:test";
import {
  AwayNotices,
  errorReason,
  finishedText,
  type JobConversation,
  NOTICE_WAIT_MS,
  ntfyBody,
  permissionText,
  questionText,
  REQUEST_TIMEOUT_MS,
  RETRY_WAIT_MS,
  responseFailure,
  stoppedText,
  testText,
  TIMEOUT_REASON,
} from "../src/core/away-notices";
import { DEFAULT_NTFY_SERVER, type NtfyTarget, ntfyServerError, ntfyServerUrl, ntfyTarget, ntfyTopicError } from "../src/core/ntfy";

describe("the validity of the settings", () => {
  test("an empty server is the default; an absolute http or https address without credentials, query or fragment is valid", () => {
    expect(ntfyServerUrl("")).toBe("https://ntfy.sh/");
    expect(ntfyServerUrl("   ")).toBe("https://ntfy.sh/");
    expect(DEFAULT_NTFY_SERVER).toBe("https://ntfy.sh");
    expect(ntfyServerUrl(" https://ntfy.example.org ")).toBe("https://ntfy.example.org/");
    expect(ntfyServerUrl("http://192.168.1.5:8080")).toBe("http://192.168.1.5:8080/");
    expect(ntfyServerUrl("https://example.org/ntfy")).toBe("https://example.org/ntfy");
    expect(ntfyServerError("https://ntfy.example.org")).toBeNull();
    expect(ntfyServerError("")).toBeNull();
  });

  test("a server that is not an absolute http or https address, or that has credentials, a query or a fragment, is refused with the field's message", () => {
    for (const bad of ["ntfy.sh", "ftp://ntfy.sh", "//ntfy.sh", "https://", "http:/ntfy.sh", "https://user@ntfy.sh", "https://user:secret@ntfy.sh", "https://ntfy.sh?x=1", "https://ntfy.sh?", "https://ntfy.sh#top", "https://ntfy.sh/#"]) {
      expect(ntfyServerUrl(bad), bad).toBeUndefined();
      expect(ntfyServerError(bad), bad).toBe("Enter an http or https address without user name or password.");
    }
  });

  test("a topic is 1 to 64 letters, digits, - or _; an empty topic is not an error", () => {
    expect(ntfyTopicError("my-topic_01")).toBeNull();
    expect(ntfyTopicError(" trimmed ")).toBeNull();
    expect(ntfyTopicError("a".repeat(64))).toBeNull();
    expect(ntfyTopicError("")).toBeNull();
    for (const bad of ["a".repeat(65), "with space", "slash/topic", "dot.topic", "è"]) expect(ntfyTopicError(bad), bad).toBe("Use 1 to 64 letters, digits, - or _.");
  });

  test("the target is off without a topic, invalid when a setting is not valid, ready otherwise", () => {
    expect(ntfyTarget(undefined, undefined)).toEqual({ state: "off" });
    expect(ntfyTarget("not a url", "")).toEqual({ state: "off" });
    expect(ntfyTarget(undefined, "  ")).toEqual({ state: "off" });
    expect(ntfyTarget(undefined, "topic")).toEqual({ state: "ready", url: "https://ntfy.sh/", topic: "topic" });
    expect(ntfyTarget("https://ntfy.example.org", " topic ")).toEqual({ state: "ready", url: "https://ntfy.example.org/", topic: "topic" });
    expect(ntfyTarget("ftp://x", "topic")).toEqual({ state: "invalid" });
    expect(ntfyTarget(undefined, "bad topic")).toEqual({ state: "invalid" });
    expect(ntfyTarget(undefined, 5)).toEqual({ state: "invalid" });
    expect(ntfyTarget(5, "topic")).toEqual({ state: "invalid" });
  });
});

describe("the text of a notification", () => {
  test("finished: one job names it, more jobs count them; same message, tag and priority", () => {
    expect(finishedText("shop", ["Scan"])).toEqual({ title: "shop - Scan finished", message: "Trama is waiting for you.", tags: ["white_check_mark"], priority: 3 });
    expect(finishedText("shop", ["Scan", "T3"]).title).toBe("shop - 2 jobs finished");
  });

  test("question, permission, stopped and test", () => {
    expect(questionText("shop", "Design")).toEqual({ title: "shop - Design asks a question", message: "The agent is waiting for your answers.", tags: ["question"], priority: 4 });
    expect(permissionText("shop", "T3")).toEqual({ title: "shop - T3 asks permission", message: "The agent is waiting for your approval.", tags: ["closed_lock_with_key"], priority: 4 });
    expect(stoppedText("shop", "Run all")).toEqual({ title: "shop - Run all stopped", message: "The agent stopped before finishing its work.", tags: ["warning"], priority: 4 });
    expect(testText("shop")).toEqual({ title: "shop - Test notification", message: "Trama's notifications reach this device.", tags: ["bell"], priority: 3 });
    expect(testText().title).toBe("Trama - Test notification");
  });

  test("the body is the topic and the text, nothing else", () => {
    expect(Object.keys(ntfyBody("topic", testText("shop")))).toEqual(["topic", "title", "message", "tags", "priority"]);
  });
});

describe("the reasons of a failure", () => {
  test("only a 2xx answer is a success; a redirect, a status, the time limit and a network error have their reason", () => {
    expect(responseFailure(200)).toBeUndefined();
    expect(responseFailure(204)).toBeUndefined();
    expect(responseFailure(301)).toBe("the server redirected the request");
    expect(responseFailure(0, "opaqueredirect")).toBe("the server redirected the request");
    expect(responseFailure(401)).toBe("HTTP 401");
    expect(responseFailure(500)).toBe("HTTP 500");
    expect(errorReason(Object.assign(new Error("signal timed out"), { name: "TimeoutError" }))).toBe(TIMEOUT_REASON);
    expect(TIMEOUT_REASON).toBe("no response within 10 seconds");
    expect(REQUEST_TIMEOUT_MS).toBe(10_000);
    expect(errorReason(new TypeError("fetch failed"))).toBe("fetch failed");
    expect(errorReason("boom")).toBe("boom");
  });
});

/** The window as the engine reads it: a clock to move, and the settings and the working state to change. */
let clock: number;
let topic: boolean;
let working: boolean;
let target: NtfyTarget;
let notices: AwayNotices;

const scan: JobConversation = { id: "a1", name: "Scan", project: "shop" };
const run: JobConversation = { id: "b2", name: "T3", project: "shop" };
const endTurn = { stopReason: "end_turn" };

beforeEach(() => {
  clock = 1_000_000;
  topic = true;
  working = false;
  target = { state: "ready", url: "https://ntfy.sh/", topic: "mine" };
  notices = new AwayNotices({ now: () => clock, topicSet: () => topic, working: () => working, target: () => target });
});

/** A job conversation starts: the window works. */
const start = (conversation: JobConversation): void => {
  working = true;
  notices.opened(conversation, true);
};
/** Its work ends with `end` and the window stops working when `stops`. */
const finish = (conversation: JobConversation, end: { stopReason: string } | { error: string } = endTurn, stops = true): void => {
  notices.closedConversation(conversation.id);
  if (stops) working = false;
  notices.turnEnded(conversation, end);
};
const elapse = (ms: number): void => {
  clock += ms;
};

describe("the finished notice", () => {
  test("is born when the window stops working because a job's work ended with end_turn, and waits thirty seconds of quiet", () => {
    start(scan);
    // The conversation stays open at rest: no `closedConversation`.
    working = false;
    notices.turnEnded(scan, endTurn);
    expect(notices.nextDeadline()).toBe(clock + NOTICE_WAIT_MS);
    expect(notices.due()).toEqual([]);
    elapse(NOTICE_WAIT_MS);
    expect(notices.due()).toEqual([{ notice: 1, attempt: 1, url: "https://ntfy.sh/", topic: "mine", text: finishedText("shop", ["Scan"]) }]);
  });

  test("goes at once when no job conversation is left open (trama.autoExit)", () => {
    start(scan);
    finish(scan);
    expect(notices.nextDeadline()).toBe(clock);
    expect(notices.due()).toHaveLength(1);
  });

  test("is not born while the window still works, for a Stop, for an abnormal end or without a topic", () => {
    start(scan);
    start(run);
    finish(scan, endTurn, false);
    expect(notices.count).toBe(0);
    finish(run, { stopReason: "cancelled" });
    expect(notices.count).toBe(0);
    start(scan);
    finish(scan, { stopReason: "refusal" });
    expect(notices.count).toBe(1);
    expect(notices.due()[0]?.text.title).toBe("shop - Scan stopped");
    topic = false;
    start(run);
    finish(run);
    expect(notices.count).toBe(1);
  });

  test("is not born when the last job to end ran in a terminal, or was closed by the developer", () => {
    start(scan);
    finish(scan, endTurn, false);
    // A terminal job was the last to end: the window stops working with no conversation end to give the notice.
    working = false;
    notices.refresh();
    expect(notices.count).toBe(0);
    start(run);
    // The developer closes the last conversation: no turn end.
    working = false;
    notices.closedConversation(run.id);
    expect(notices.count).toBe(0);
  });

  test("restarts its thirty seconds with each update or message of a job conversation still open, never with another conversation's", () => {
    notices.opened(scan, true);
    notices.opened(run, true);
    working = true;
    notices.turnEnded(run, endTurn);
    working = false;
    notices.turnEnded(scan, endTurn);
    expect(notices.count).toBe(1);
    elapse(20_000);
    notices.activity(run.id);
    expect(notices.nextDeadline()).toBe(clock + NOTICE_WAIT_MS);
    elapse(20_000);
    notices.activity("not-open");
    expect(notices.due()).toEqual([]);
    elapse(10_000);
    expect(notices.due()).toHaveLength(1);
  });

  test("is cancelled by any conversation of omp Chat that opens, a job or Ask more", () => {
    notices.opened(scan, true);
    working = false;
    notices.turnEnded(scan, endTurn);
    expect(notices.count).toBe(1);
    notices.opened({ id: "ask", name: "Ask more", project: "shop" }, false);
    expect(notices.count).toBe(0);
    notices.turnEnded(scan, endTurn);
    expect(notices.count).toBe(1);
    start(run);
    expect(notices.count).toBe(0);
  });

  test("does not go when the window works again, or the topic was removed or a setting is not valid; nothing is requested", () => {
    notices.opened(scan, true);
    notices.turnEnded(scan, endTurn);
    expect(notices.count).toBe(1);
    elapse(NOTICE_WAIT_MS);
    working = true;
    expect(notices.due()).toEqual([]);
    expect(notices.count).toBe(0);
    working = false;
    notices.turnEnded(scan, endTurn);
    elapse(NOTICE_WAIT_MS);
    target = { state: "off" };
    expect(notices.due()).toEqual([]);
    expect(notices.count).toBe(0);
    notices.turnEnded(scan, endTurn);
    elapse(NOTICE_WAIT_MS);
    target = { state: "invalid" };
    expect(notices.due()).toEqual([]);
    expect(notices.count).toBe(0);
  });

  test("a window holds one at a time; the jobs counted are those finished since it last started working", () => {
    notices.opened(scan, true);
    notices.opened(run, true);
    working = true;
    notices.refresh();
    notices.turnEnded(scan, endTurn);
    working = false;
    notices.turnEnded(run, endTurn);
    notices.turnEnded(run, endTurn);
    expect(notices.count).toBe(1);
    elapse(NOTICE_WAIT_MS);
    expect(notices.due()[0]?.text.title).toBe("shop - 2 jobs finished");
    notices.settled(1, true);
    // The window works again and the list starts over.
    working = true;
    notices.refresh();
    working = false;
    notices.turnEnded(scan, endTurn);
    elapse(NOTICE_WAIT_MS);
    expect(notices.due()[0]?.text.title).toBe("shop - Scan finished");
  });
});

describe("the question notice", () => {
  test("is born when a round of a job conversation is presented, goes thirty seconds later and does not start again", () => {
    notices.opened(scan, true);
    notices.roundOpened(7, scan.id);
    expect(notices.nextDeadline()).toBe(clock + NOTICE_WAIT_MS);
    elapse(10_000);
    notices.activity(scan.id);
    expect(notices.nextDeadline()).toBe(clock + 20_000);
    elapse(20_000);
    expect(notices.due()).toEqual([{ notice: 1, attempt: 1, url: "https://ntfy.sh/", topic: "mine", text: questionText("shop", "Scan") }]);
  });

  test("is cancelled when its round closes, and only that round's", () => {
    notices.opened(scan, true);
    notices.roundOpened(7, scan.id);
    notices.roundOpened(8, scan.id);
    notices.roundClosed(7);
    expect(notices.count).toBe(1);
    elapse(NOTICE_WAIT_MS);
    expect(notices.due()).toHaveLength(1);
  });

  test("is never born for a round of Ask more, General, a terminal, a prepared question or without a topic", () => {
    notices.opened({ id: "ask", name: "Ask more", project: "shop" }, false);
    notices.roundOpened(1, "ask");
    notices.roundOpened(2, "terminal-1");
    notices.roundOpened(3, undefined);
    notices.opened(scan, true);
    topic = false;
    notices.roundOpened(4, scan.id);
    expect(notices.count).toBe(0);
  });
});

describe("the permission notice", () => {
  test("is born for each request, goes thirty seconds later and is cancelled by its answer or its cancellation, one request at a time", () => {
    notices.opened(scan, true);
    notices.permissionAsked(scan.id, "permission-1");
    notices.permissionAsked(scan.id, "permission-2");
    expect(notices.count).toBe(2);
    notices.permissionSettled(scan.id, "permission-1");
    expect(notices.count).toBe(1);
    elapse(NOTICE_WAIT_MS);
    expect(notices.due()).toEqual([{ notice: 2, attempt: 1, url: "https://ntfy.sh/", topic: "mine", text: permissionText("shop", "Scan") }]);
  });

  test("is cancelled by the end of the turn, the end of the process and the closing of its conversation", () => {
    notices.opened(scan, true);
    notices.opened(run, true);
    notices.permissionAsked(scan.id, "permission-1");
    notices.turnEnded(scan, { stopReason: "cancelled" });
    expect(notices.count).toBe(0);
    notices.permissionAsked(scan.id, "permission-2");
    notices.exited(scan, false);
    expect(notices.count).toBe(0);
    notices.permissionAsked(run.id, "permission-1");
    notices.closedConversation(run.id);
    expect(notices.count).toBe(0);
  });

  test("is never born for a conversation that is not a job of the window", () => {
    notices.opened({ id: "ask", name: "Ask more", project: "shop" }, false);
    notices.permissionAsked("ask", "permission-1");
    notices.permissionAsked("unknown", "permission-1");
    expect(notices.count).toBe(0);
  });
});

describe("the stopped notice", () => {
  test("is born with no wait for every abnormal end of a job's work, also while other jobs work", () => {
    for (const end of [{ stopReason: "refusal" }, { stopReason: "max_tokens" }, { stopReason: "max_turn_requests" }, { error: "bad model" }]) {
      const fresh = new AwayNotices({ now: () => clock, topicSet: () => true, working: () => true, target: () => target });
      fresh.opened(scan, true);
      fresh.turnEnded(scan, end);
      expect(fresh.nextDeadline()).toBe(clock);
      expect(fresh.due()[0]?.text).toEqual(stoppedText("shop", "Scan"));
    }
  });

  test("is born at the end of the process from Agent running, not from Agent idle", () => {
    notices.opened(scan, true);
    notices.exited(scan, true);
    expect(notices.nextDeadline()).toBe(clock);
    expect(notices.due()[0]?.text).toEqual(stoppedText("shop", "Scan"));
    notices.settled(1, true);
    notices.exited(scan, false);
    expect(notices.count).toBe(0);
  });

  test("is not born without a topic", () => {
    topic = false;
    notices.exited(scan, true);
    notices.turnEnded(scan, { stopReason: "refusal" });
    expect(notices.count).toBe(0);
  });
});

describe("sending", () => {
  const born = (): void => {
    notices.opened(scan, true);
    notices.exited(scan, true);
  };

  test("a notice delivered is over", () => {
    born();
    expect(notices.due()).toHaveLength(1);
    expect(notices.nextDeadline()).toBeUndefined();
    notices.settled(1, true);
    expect(notices.count).toBe(0);
  });

  test("a failure waits ten seconds and tries once more with the same text; a second failure is given up", () => {
    born();
    const first = notices.due()[0]!;
    notices.settled(1, false);
    expect(notices.nextDeadline()).toBe(clock + RETRY_WAIT_MS);
    expect(notices.due()).toEqual([]);
    elapse(RETRY_WAIT_MS);
    const second = notices.due()[0];
    expect(second).toEqual({ ...first, attempt: 2 });
    notices.settled(1, false);
    expect(notices.count).toBe(0);
    expect(notices.nextDeadline()).toBeUndefined();
  });

  test("the retry is made only when the topic is still set and both settings are valid", () => {
    born();
    notices.due();
    notices.settled(1, false);
    elapse(RETRY_WAIT_MS);
    target = { state: "invalid" };
    expect(notices.due()).toEqual([]);
    expect(notices.count).toBe(0);
  });

  test("the retry sends the text composed for the first attempt, not one composed again", () => {
    notices.opened(scan, true);
    notices.opened(run, true);
    working = true;
    notices.refresh();
    notices.turnEnded(scan, endTurn);
    working = false;
    notices.turnEnded(run, endTurn);
    elapse(NOTICE_WAIT_MS);
    const first = notices.due()[0];
    expect(first?.text.title).toBe("shop - 2 jobs finished");
    notices.settled(1, false);
    working = true;
    notices.refresh();
    working = false;
    notices.turnEnded(scan, endTurn);
    elapse(RETRY_WAIT_MS);
    expect(notices.due()[0]?.text).toEqual(first?.text as NonNullable<typeof first>["text"]);
  });

  test("a retrying finished notice is not cancelled by the window opening a conversation, but it is by the window closing", () => {
    notices.opened(scan, true);
    working = false;
    notices.turnEnded(scan, endTurn);
    elapse(NOTICE_WAIT_MS);
    notices.due();
    notices.settled(1, false);
    notices.opened(run, true);
    expect(notices.count).toBe(1);
    notices.windowClosed();
    expect(notices.count).toBe(0);
    expect(notices.nextDeadline()).toBeUndefined();
  });

  test("closing the window cancels every waiting notice and nothing is born again", () => {
    notices.opened(scan, true);
    notices.permissionAsked(scan.id, "permission-1");
    notices.roundOpened(1, scan.id);
    notices.windowClosed();
    expect(notices.count).toBe(0);
    notices.exited(scan, true);
    notices.permissionAsked(scan.id, "permission-2");
    expect(notices.count).toBe(0);
    expect(notices.due()).toEqual([]);
  });

  test("a finished notice is one at a time even while its request is on its way", () => {
    notices.opened(scan, true);
    notices.turnEnded(scan, endTurn);
    elapse(NOTICE_WAIT_MS);
    notices.due();
    notices.turnEnded(scan, endTurn);
    expect(notices.count).toBe(1);
  });
});
