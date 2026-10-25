import { beforeEach, expect, mock, test } from "bun:test";

const shown: { message: string; buttons: string[] }[] = [];
const commands: string[] = [];
const order: string[] = [];
let choose: string | undefined;

mock.module("vscode", () => ({
  window: {
    showInformationMessage: async (message: string, ...buttons: string[]) => (order.push("message"), shown.push({ message, buttons }), choose),
  },
  commands: { executeCommand: async (id: string) => void commands.push(id) },
}));

import { setYoloNoticeStore, showYoloNoticeOnce, YOLO_NOTICE, YOLO_NOTICE_KEY } from "../extension/src/host/yolo-notice";

const storeOf = (initial?: boolean) => {
  const memory = new Map<string, unknown>(initial === undefined ? [] : [[YOLO_NOTICE_KEY, initial]]);
  return { memory, store: { get: <T>(key: string) => memory.get(key) as T | undefined, update: async (key: string, value: unknown) => void (order.push("write"), memory.set(key, value)) } };
};

/** The write of the key and the message are microtasks: no real time passes. */
const settled = async () => {
  for (let turn = 0; turn < 20; turn++) await Promise.resolve();
};

beforeEach(() => {
  shown.length = 0;
  commands.length = 0;
  order.length = 0;
  choose = undefined;
  setYoloNoticeStore(undefined);
});

test("the notice has the exact text, one Open Settings button, and the key is written before the message", async () => {
  const { memory, store } = storeOf();
  setYoloNoticeStore(store);
  showYoloNoticeOnce();
  await settled();
  expect(YOLO_NOTICE).toBe("Trama: omp Chat now runs commands without asking (yolo). Change it in Settings.");
  expect(YOLO_NOTICE_KEY).toBe("trama.yoloNoticeShown");
  expect(shown).toEqual([{ message: YOLO_NOTICE, buttons: ["Open Settings"] }]);
  expect(memory.get(YOLO_NOTICE_KEY)).toBe(true);
  expect(order).toEqual(["write", "message"]);
  expect(commands).toEqual([]);
});

test("it appears at most once: a second call, in this window or another one sharing the store, shows nothing", async () => {
  const { store } = storeOf();
  setYoloNoticeStore(store);
  showYoloNoticeOnce();
  showYoloNoticeOnce();
  await settled();
  showYoloNoticeOnce();
  await settled();
  expect(shown).toHaveLength(1);
});

test("a key already true shows nothing and writes nothing; without a store nothing happens", async () => {
  const { store } = storeOf(true);
  setYoloNoticeStore(store);
  showYoloNoticeOnce();
  setYoloNoticeStore(undefined);
  showYoloNoticeOnce();
  await settled();
  expect(shown).toEqual([]);
  expect(order).toEqual([]);
});

test("Open Settings opens the Trama panel on the Settings tab; closing the message does nothing else", async () => {
  choose = "Open Settings";
  const { store } = storeOf();
  setYoloNoticeStore(store);
  showYoloNoticeOnce();
  await settled();
  expect(commands).toEqual(["trama.openSettings"]);

  commands.length = 0;
  choose = undefined;
  setYoloNoticeStore(storeOf().store);
  showYoloNoticeOnce();
  await settled();
  expect(commands).toEqual([]);
});
