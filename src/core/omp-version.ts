// The minimum omp version and how `omp --version` is read. Pure and free of Node modules: the host and the panel's webview both import it.

/** The oldest omp Trama works with: the version its ACP connection is written for. Older versions have no special path. */
export const MIN_OMP_VERSION = "18.12.6";

const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g;

/** The version in the output of `omp --version`: the first version number of the first non-empty line, or that line. Undefined for no output. */
export function parseOmpVersion(output: string): string | undefined {
  const line = output.replace(ANSI, "").split(/\r?\n/).map((l) => l.trim()).find((l) => l !== "");
  if (line === undefined) return undefined;
  return /\d+\.\d+\.\d+[^\s/,)]*/.exec(line)?.[0] ?? line;
}

/** The numbers of `major.minor.patch` at the start of `version` and whether a pre-release suffix (`-beta.1`) follows; undefined when it is not a version. */
function versionParts(version: string): { numbers: [number, number, number]; prerelease: boolean } | undefined {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(.*)$/.exec(version.trim());
  if (match === null) return undefined;
  return { numbers: [Number(match[1]), Number(match[2]), Number(match[3])], prerelease: (match[4] ?? "").startsWith("-") };
}

/** Whether `version` is `MIN_OMP_VERSION` or later. An unreadable version (undefined, or text that is not `major.minor.patch`) is not; a pre-release sorts before its release. */
export function ompMeetsMinimum(version: string | undefined): boolean {
  const found = version === undefined ? undefined : versionParts(version);
  const minimum = versionParts(MIN_OMP_VERSION);
  if (found === undefined || minimum === undefined) return false;
  for (let i = 0; i < 3; i++) {
    const a = found.numbers[i] as number;
    const b = minimum.numbers[i] as number;
    if (a !== b) return a > b;
  }
  return !found.prerelease;
}

/** The sentence for an omp older than the minimum, or whose version cannot be read (`version` undefined). English, whatever `trama.language` says. */
export const ompTooOldText = (version: string | undefined): string => `Trama needs omp ${MIN_OMP_VERSION} or later; the installed omp is ${version ?? "unknown"}.`;
