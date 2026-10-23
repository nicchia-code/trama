import { z } from "zod";
import type { ToChatHost } from "../../omp-chat-protocol";

const MAX_TEXT = 200_000;
const MAX_PATH = 4096;
const MAX_URL = 2048;
const id = z.string().min(1).max(200);

const answerValue = z.union([z.string().max(MAX_TEXT), z.number(), z.boolean(), z.array(z.string().max(MAX_TEXT)).max(500)]);

const messages = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("ready") }),
  z.strictObject({ type: z.literal("selectConversation"), id }),
  z.strictObject({ type: z.literal("sendMessage"), id, text: z.string().min(1).max(MAX_TEXT) }),
  z.strictObject({ type: z.literal("stopAgent"), id }),
  z.strictObject({ type: z.literal("closeConversation"), id }),
  z.strictObject({ type: z.literal("setModel"), id, model: z.string().min(1).max(500) }),
  z.strictObject({
    type: z.literal("formAnswer"),
    id,
    requestId: z.string().min(1).max(200),
    answer: z.discriminatedUnion("action", [
      z.strictObject({ action: z.literal("accept"), content: z.record(z.string().max(500), answerValue) }),
      z.strictObject({ action: z.literal("decline") }),
    ]),
  }),
  z.strictObject({ type: z.literal("permissionAnswer"), id, requestId: z.string().min(1).max(200), optionId: z.string().min(1).max(500) }),
  z.strictObject({ type: z.literal("openFile"), path: z.string().min(1).max(MAX_PATH) }),
  z.strictObject({ type: z.literal("openLink"), url: z.string().min(1).max(MAX_URL) }),
]);

/** A message from the webview, or undefined when it does not fit the protocol: it is ignored. */
export function parseChatMessage(raw: unknown): ToChatHost | undefined {
  const parsed = messages.safeParse(raw);
  return parsed.success ? (parsed.data as ToChatHost) : undefined;
}
