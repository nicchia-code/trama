import * as vscode from "vscode";
import { listAnnouncements, takeDeliveredSystemChecks, type Announcement, type DeliveredSystemCheck } from "../../../src/core/announcements";
import { writeLastScan } from "../../../src/core/last-scan";
import { projectAt } from "../../../src/core/store";
import { onCopilotChatEvent } from "./copilot-chat";
import { onCursorChatEvent } from "./cursor";

export type ScanDestination = { terminal: string } | { chat: "cursor" | "copilot" };
interface Launch { root: string; startedAt: number; destination: ScanDestination; check?: string; }
const launches: Launch[] = [];

export function rememberGlobalScan(root: string, startedAt: number, destination: ScanDestination): void {
  launches.push({ root, startedAt, destination });
}

function matchesDestination(launch: Launch, a: Pick<Announcement, "terminal" | "chat"> | DeliveredSystemCheck): boolean {
  return "terminal" in launch.destination
    ? a.terminal === launch.destination.terminal
    : a.chat === (launch.destination.chat === "cursor" ? "cursor" : "editor");
}

function removeLaunch(launch: Launch): void {
  const index = launches.indexOf(launch);
  if (index !== -1) launches.splice(index, 1);
}

function forget(root: string, matches: (launch: Launch) => boolean): void {
  for (let i = launches.length - 1; i >= 0; i--) {
    const launch = launches[i];
    if (launch?.root === root && matches(launch)) launches.splice(i, 1);
  }
}

function consumeDeliveredSignals(root: string): void {
  let delivered: DeliveredSystemCheck[];
  try { delivered = takeDeliveredSystemChecks(projectAt(root)); } catch { return; }
  for (const signal of delivered) {
    const launch = launches
      .filter((item) => item.root === root && matchesDestination(item, signal) && Date.parse(signal.touched) >= item.startedAt)
      .sort((a, b) => b.startedAt - a.startedAt)[0];
    if (launch) deliver(root, launch);
  }
}

function forgetOrDeliver(root: string, launch: Launch): void {
  if (launch.check !== undefined) {
    try {
      if (!listAnnouncements(projectAt(root)).some((a) => a.id === launch.check)) {
        deliver(root, launch);
        return;
      }
    } catch { /* The work ended; do not retain an unverifiable launch. */ }
  }
  removeLaunch(launch);
}

export function forgetGlobalScansForTerminal(terminal: string): void {
  const pending = launches.filter((launch) => "terminal" in launch.destination && launch.destination.terminal === terminal);
  for (const root of new Set(pending.map((launch) => launch.root))) consumeDeliveredSignals(root);
  for (const launch of [...launches]) {
    if ("terminal" in launch.destination && launch.destination.terminal === terminal)
      forgetOrDeliver(launch.root, launch);
  }
}

export function forgetGlobalScansForChat(root: string, chat: "cursor" | "copilot"): void {
  consumeDeliveredSignals(root);
  for (const launch of [...launches]) {
    if (launch.root === root && "chat" in launch.destination && launch.destination.chat === chat)
      forgetOrDeliver(root, launch);
  }
}

export function forgetWithdrawnGlobalScan(root: string, announcement: Announcement): void {
  if (announcement.kind !== "check" || announcement.title !== "Scan of the System") return;
  forget(root, (launch) => matchesDestination(launch, announcement) && Date.parse(announcement.touched) >= launch.startedAt);
}

function deliver(root: string, launch: Launch): void {
  try {
    writeLastScan(projectAt(root), new Date(launch.startedAt).toISOString());
  } catch (error) {
    void vscode.window.showErrorMessage(`Trama: could not remember the completed System scan: ${error instanceof Error ? error.message : String(error)}`);
  }
  const index = launches.indexOf(launch);
  if (index !== -1) launches.splice(index, 1);
}

function checkAnnouncements(root: string): void {
  consumeDeliveredSignals(root);
  const pending = launches.filter((launch) => launch.root === root);
  if (pending.length === 0) return;
  let announcements: Announcement[];
  try { announcements = listAnnouncements(projectAt(root)); } catch { return; }
  const checks = announcements.filter((a) => a.kind === "check" && a.title === "Scan of the System");
  for (const launch of pending) {
    const check = checks.find((a) => matchesDestination(launch, a) && Date.parse(a.touched) >= launch.startedAt);
    if (check) launch.check = check.id;
    else if (launch.check !== undefined) deliver(root, launch);
  }
}

export function watchGlobalScans(root: () => string | undefined): vscode.Disposable {
  const timer = setInterval(() => {
    const roots = new Set(launches.map((launch) => launch.root));
    const current = root();
    if (current !== undefined) roots.add(current);
    for (const projectRoot of roots) checkAnnouncements(projectRoot);
  }, 200);
  const cursor = onCursorChatEvent((event) => {
    if (event.event === "AGENT_STOPPED" || event.event === "AGENT_INTERRUPTED" || event.event === "CONVERSATION_CLOSED")
      forgetGlobalScansForChat(event.root, "cursor");
  });
  const copilot = onCopilotChatEvent((event) => {
    if (event.event === "AGENT_STOPPED") forgetGlobalScansForChat(event.root, "copilot");
  });
  return new vscode.Disposable(() => (clearInterval(timer), cursor.dispose(), copilot.dispose()));
}
