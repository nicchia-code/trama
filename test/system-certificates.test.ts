import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rootCertificates } from "node:tls";
import { cursorKeyEnv, startCursorApiKey } from "../extension/src/host/cursor-api-key";
import {
  BUNDLE_MAX_AGE_MS,
  buildBundle,
  bundlePath,
  bundleStaleAsync,
  CERTIFICATE_VARIABLES,
  countCertificates,
  ExportFailure,
  exportBundle,
  exportFailureMessage,
  loadBundleStateAsync,
  onSystemCertificatesChanged,
  resetSystemCertificatesState,
  runExport,
  splitPem,
  systemCertificatesEnv,
  systemCertificatesState,
  writeBundle,
} from "../extension/src/host/system-certificates";

// A certificate authority and a certificate that is not one (`basicConstraints` CA:TRUE and CA:FALSE), both self-signed and valid for a hundred years.
const CA = `-----BEGIN CERTIFICATE-----
MIIBZTCCAQygAwIBAgIUaq65BLhkaNrHDM5Hm/WBfrOFgg0wCgYIKoZIzj0EAwIw
GDEWMBQGA1UEAwwNVHJhbWEgdGVzdCBjYTAgFw0yNjEwMjUwNzIxMzFaGA8yMTI2
MTAwMTA3MjEzMVowGDEWMBQGA1UEAwwNVHJhbWEgdGVzdCBjYTBZMBMGByqGSM49
AgEGCCqGSM49AwEHA0IABHSXqAldslbw8Bvj7Wb+PuqInFsmLmd6W5IK6I048E+a
SIw2rI0cbLnCaqeZ/MNINTLSMKawZjp78aN6bmA7ogGjMjAwMB0GA1UdDgQWBBS3
KXP/kTTIn5VVu9rqMHhIWfIeBDAPBgNVHRMBAf8EBTADAQH/MAoGCCqGSM49BAMC
A0cAMEQCIBbhDHba77KEKUJ8vi3I/HQcVyKWBzdudnPJBu9UJCelAiAjJ+QJKDxv
pH3vkL889yhR2bWTT9pp7hRHGCK2khCZjQ==
-----END CERTIFICATE-----`;
const LEAF = `-----BEGIN CERTIFICATE-----
MIIBaDCCAQ2gAwIBAgIUFJGDAbsmKAzKEYfSuXLI4yJAXeUwCgYIKoZIzj0EAwIw
GjEYMBYGA1UEAwwPVHJhbWEgdGVzdCBsZWFmMCAXDTI2MTAyNTA3MjEzMVoYDzIx
MjYxMDAxMDcyMTMxWjAaMRgwFgYDVQQDDA9UcmFtYSB0ZXN0IGxlYWYwWTATBgcq
hkjOPQIBBggqhkjOPQMBBwNCAAQysLfPDrorkz47tspLuwzIagwJQkJ91vhvRybi
6wDExYMw+1sFN3WBKEoW/po0/l1uoDVzZhTBaT8/RZQkhPC5oy8wLTAdBgNVHQ4E
FgQU4eLmrPnV3KVB50FBPCQ+Z2d0sHgwDAYDVR0TAQH/BAIwADAKBggqhkjOPQQD
AgNJADBGAiEAsZralpaCFtT9sv+aMSmESnbZ4Lk/YsJf3MTyIkD91yMCIQDTHwDl
mS7m1Lf50n+VldQamfLy1qB5YcR/vhCULuTqOA==
-----END CERTIFICATE-----`;
const BROKEN = "-----BEGIN CERTIFICATE-----\nbm90IGEgY2VydGlmaWNhdGU=\n-----END CERTIFICATE-----";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-certs-"));
  resetSystemCertificatesState();
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

test("the bundle keeps the readable certificate authorities of the source and adds the public roots, each once", () => {
  const built = buildBundle([CA, LEAF, BROKEN, CA, rootCertificates[0]].join("\n"), rootCertificates);
  if (!built.ok) throw new Error(built.reason);
  // The corporate authority of the source, then every public root (the one the source repeated counts once).
  expect(built.count).toBe(1 + rootCertificates.length);
  const blocks = splitPem(built.pem);
  expect(blocks).toHaveLength(built.count);
  expect(blocks[0]).toBe(CA);
  expect(blocks).not.toContain(LEAF);
  expect(blocks.some((block) => block.includes("bm90IGEgY2VydGlmaWNhdGU="))).toBe(false);
  expect(built.pem.endsWith("-----END CERTIFICATE-----\n")).toBe(true);
});

test("a source with no certificate authority is the failure `no certificate authority found`, whatever the public roots add", () => {
  expect(buildBundle("", rootCertificates)).toEqual({ ok: false, reason: "no certificate authority found" });
  expect(buildBundle("not a certificate at all", rootCertificates)).toEqual({ ok: false, reason: "no certificate authority found" });
  expect(buildBundle([LEAF, BROKEN].join("\n"), rootCertificates)).toEqual({ ok: false, reason: "no certificate authority found" });
});

test("line breaks of the Windows output are normalized and a bundle's certificates can be counted back", () => {
  const crlf = CA.replace(/\n/g, "\r\n");
  const built = buildBundle(crlf, []);
  if (!built.ok) throw new Error(built.reason);
  expect(built.pem).toBe(`${CA}\n`);
  expect(built.pem.includes("\r")).toBe(false);
  expect(countCertificates(built.pem)).toBe(1);
});

test("the bundle's path is per user: macOS and Windows caches, and XDG_CACHE_HOME (else ~/.cache) elsewhere", () => {
  expect(bundlePath("darwin", {}, "/Users/ana")).toBe("/Users/ana/Library/Caches/Trama/system-certificates.pem");
  expect(bundlePath("win32", { LOCALAPPDATA: "C:\\Users\\ana\\AppData\\Local" }, "C:\\Users\\ana")).toBe("C:\\Users\\ana\\AppData\\Local\\Trama\\system-certificates.pem");
  expect(bundlePath("win32", {}, "C:\\Users\\ana")).toBe("C:\\Users\\ana\\AppData\\Local\\Trama\\system-certificates.pem");
  expect(bundlePath("linux", { XDG_CACHE_HOME: "/var/cache/ana" }, "/home/ana")).toBe("/var/cache/ana/trama/system-certificates.pem");
  expect(bundlePath("linux", {}, "/home/ana")).toBe("/home/ana/.cache/trama/system-certificates.pem");
  expect(bundlePath("linux", { XDG_CACHE_HOME: "" }, "/home/ana")).toBe("/home/ana/.cache/trama/system-certificates.pem");
});

test("the bundle is written whole through a temporary file; a rename that fails leaves the earlier bundle and no temporary file", () => {
  const path = join(dir, "cache", "trama", "system-certificates.pem");
  writeBundle(path, "first\n");
  expect(readFileSync(path, "utf8")).toBe("first\n");
  expect(readdirSync(join(dir, "cache", "trama"))).toEqual(["system-certificates.pem"]);
  const temporaries: string[] = [];
  expect(() =>
    writeBundle(path, "second\n", (from) => {
      temporaries.push(from);
      expect(readFileSync(from, "utf8")).toBe("second\n");
      expect(readFileSync(path, "utf8")).toBe("first\n");
      throw new Error("disk is full");
    }),
  ).toThrow("disk is full");
  expect(temporaries).toEqual([`${path}.${process.pid}.tmp`]);
  expect(readFileSync(path, "utf8")).toBe("first\n");
  expect(readdirSync(join(dir, "cache", "trama"))).toEqual(["system-certificates.pem"]);
});

test("the variables are the nine of the bundle's path with the mode on and a bundle on disk, and none otherwise", () => {
  const path = join(dir, "system-certificates.pem");
  expect(systemCertificatesEnv(true, path)).toEqual({});
  writeFileSync(path, "bundle\n");
  const env = systemCertificatesEnv(true, path);
  expect(Object.keys(env).sort()).toEqual([...CERTIFICATE_VARIABLES].sort());
  expect(CERTIFICATE_VARIABLES).toEqual(["NODE_EXTRA_CA_CERTS", "SSL_CERT_FILE", "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE", "GIT_SSL_CAINFO", "PIP_CERT", "CARGO_HTTP_CAINFO", "AWS_CA_BUNDLE", "DENO_CERT"]);
  for (const value of Object.values(env)) expect(value).toBe(path);
  expect(systemCertificatesEnv(false, path)).toEqual({});
  // Trama never turns the checking of certificates off.
  for (const name of ["NODE_TLS_REJECT_UNAUTHORIZED", "GIT_SSL_NO_VERIFY", "PYTHONHTTPSVERIFY"]) expect(env).not.toHaveProperty(name);
});

test("the variables win over the inherited environment and sit next to CURSOR_ACCESS_TOKEN", async () => {
  const path = join(dir, "system-certificates.pem");
  writeFileSync(path, "bundle\n");
  const secrets = {
    get: async () => "sk-cursor",
    store: async () => undefined,
    delete: async () => undefined,
    onDidChange: () => ({ dispose() {} }),
  };
  const subscription = await startCursorApiKey(secrets as never, () => undefined);
  try {
    const inherited = { PATH: "/usr/bin", NODE_EXTRA_CA_CERTS: "/corporate/old.pem", SSL_CERT_FILE: "/corporate/old.pem", CURSOR_ACCESS_TOKEN: "editor" };
    const merged = { ...inherited, ...cursorKeyEnv(), ...systemCertificatesEnv(true, path) };
    expect(merged["NODE_EXTRA_CA_CERTS"]).toBe(path);
    expect(merged["SSL_CERT_FILE"]).toBe(path);
    expect(merged["CURSOR_ACCESS_TOKEN"]).toBe("sk-cursor");
    expect(merged["PATH"]).toBe("/usr/bin");
    // With the mode off the inherited values stay as they are.
    const off = { ...inherited, ...cursorKeyEnv(), ...systemCertificatesEnv(false, path) };
    expect(off["NODE_EXTRA_CA_CERTS"]).toBe("/corporate/old.pem");
  } finally {
    subscription.dispose();
  }
});

test("an export reads the source, writes the bundle and reports its count and time; a failed one keeps the earlier bundle", async () => {
  const path = join(dir, "trama", "system-certificates.pem");
  const first = await exportBundle({ read: async () => `${CA}\n${LEAF}`, path, roots: [] });
  expect(first.ok).toBe(true);
  if (!first.ok) return;
  expect(first.count).toBe(1);
  expect(first.exportedAt).toBe(statSync(path).mtime.toISOString());
  const before = readFileSync(path, "utf8");

  expect(await exportBundle({ read: async () => Promise.reject(new ExportFailure("could not start security")), path, roots: [] })).toEqual({ ok: false, reason: "could not start security" });
  expect(await exportBundle({ read: async () => LEAF, path, roots: [] })).toEqual({ ok: false, reason: "no certificate authority found" });
  const failing = await exportBundle({
    read: async () => CA,
    path,
    roots: rootCertificates,
    rename: () => {
      throw new Error("EACCES: permission denied");
    },
  });
  expect(failing).toEqual({ ok: false, reason: "could not write the bundle: EACCES: permission denied" });
  expect(readFileSync(path, "utf8")).toBe(before);
});

test("the state says exporting meanwhile, keeps the earlier bundle's count and time after a failure and ignores a second request while one runs", async () => {
  const path = join(dir, "system-certificates.pem");
  const seen: string[] = [];
  const subscription = onSystemCertificatesChanged((state) => seen.push(JSON.stringify(state)));
  try {
    const release = Promise.withResolvers<string>();
    const running = runExport({ read: () => release.promise, path, roots: [] });
    expect(systemCertificatesState()).toEqual({ exporting: true });
    // A second request during the export of this window does nothing.
    expect(await runExport({ read: async () => CA, path, roots: [] })).toBeUndefined();
    expect(existsSync(path)).toBe(false);
    release.resolve(CA);
    const done = await running;
    expect(done?.ok).toBe(true);
    const state = systemCertificatesState();
    expect(state.exporting).toBe(false);
    expect(state.count).toBe(1);
    expect(typeof state.exportedAt).toBe("string");
    expect(state).not.toHaveProperty("error");

    const failed = await runExport({ read: async () => "", path, roots: [] });
    expect(failed).toEqual({ ok: false, reason: "no certificate authority found" });
    expect(systemCertificatesState()).toEqual({ exporting: false, count: 1, exportedAt: state.exportedAt as string, error: "no certificate authority found" });
    expect(seen.length).toBeGreaterThanOrEqual(4);
    expect(JSON.parse(seen[0] as string)).toEqual({ exporting: true });
  } finally {
    subscription.dispose();
  }
});

test("the bundle is stale when it is missing or older than 24 hours, and loading it reads its count and time", async () => {
  const path = join(dir, "system-certificates.pem");
  const now = Date.now();
  expect(await bundleStaleAsync(now, path)).toBe(true);
  writeBundle(path, `${CA}\n${LEAF}\n`);
  utimesSync(path, new Date(now - BUNDLE_MAX_AGE_MS + 60_000), new Date(now - BUNDLE_MAX_AGE_MS + 60_000));
  expect(await bundleStaleAsync(now, path)).toBe(false);
  utimesSync(path, new Date(now - BUNDLE_MAX_AGE_MS - 60_000), new Date(now - BUNDLE_MAX_AGE_MS - 60_000));
  expect(await bundleStaleAsync(now, path)).toBe(true);
  await loadBundleStateAsync(path);
  expect(systemCertificatesState()).toEqual({ exporting: false, count: 2, exportedAt: statSync(path).mtime.toISOString() });
  await loadBundleStateAsync(join(dir, "missing.pem"));
  expect(systemCertificatesState()).toEqual({ exporting: false });
  mkdirSync(join(dir, "folder"));
  await loadBundleStateAsync(join(dir, "folder"));
  expect(systemCertificatesState()).toEqual({ exporting: false });
});

test("the editor's message of a failed export names the reason and, with an earlier bundle, its time", () => {
  expect(exportFailureMessage("no certificate bundle found", undefined)).toBe("Trama: could not export the system certificates: no certificate bundle found.");
  const message = exportFailureMessage("security exited with code 44", "2026-10-25T10:00:00.000Z");
  expect(message.startsWith("Trama: could not export the system certificates: security exited with code 44. Using the ones exported ")).toBe(true);
  expect(message.endsWith(".")).toBe(true);
});
