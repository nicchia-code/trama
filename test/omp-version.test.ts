import { expect, test } from "bun:test";
import { MIN_OMP_VERSION, ompMeetsMinimum, ompTooOldText, parseOmpVersion } from "../src/core/omp-version";

test("the minimum omp version is 18.12.6, the version Trama's ACP connection is written for", () => {
  expect(MIN_OMP_VERSION).toBe("18.12.6");
});

test("the version is read from the first non-empty line of omp --version, without colour codes", () => {
  expect(parseOmpVersion("18.12.6\n")).toBe("18.12.6");
  expect(parseOmpVersion("\n  \n18.12.6\n")).toBe("18.12.6");
  expect(parseOmpVersion("\u001b[1momp/18.12.6-beta.2\u001b[0m\nmore")).toBe("18.12.6-beta.2");
  expect(parseOmpVersion("omp 18.13.0 (abc)")).toBe("18.13.0");
  expect(parseOmpVersion("omp dev build")).toBe("omp dev build");
  expect(parseOmpVersion("  \n")).toBeUndefined();
  expect(parseOmpVersion("")).toBeUndefined();
});

test("the minimum and every later version meet it, the earlier ones do not, compared number by number", () => {
  expect(ompMeetsMinimum("18.12.6")).toBe(true);
  expect(ompMeetsMinimum("18.12.7")).toBe(true);
  expect(ompMeetsMinimum("18.13.0")).toBe(true);
  expect(ompMeetsMinimum("19.0.0")).toBe(true);
  expect(ompMeetsMinimum("100.0.0")).toBe(true);
  expect(ompMeetsMinimum("v18.12.6")).toBe(true);
  expect(ompMeetsMinimum("18.12.5")).toBe(false);
  expect(ompMeetsMinimum("18.11.99")).toBe(false);
  expect(ompMeetsMinimum("17.99.99")).toBe(false);
  expect(ompMeetsMinimum("9.0.0")).toBe(false);
});

test("a pre-release sorts before its release, and a version that cannot be read is too old", () => {
  expect(ompMeetsMinimum("18.12.6-beta.1")).toBe(false);
  expect(ompMeetsMinimum("18.12.7-beta.1")).toBe(true);
  expect(ompMeetsMinimum("18.13.0-rc.1")).toBe(true);
  expect(ompMeetsMinimum(undefined)).toBe(false);
  expect(ompMeetsMinimum("")).toBe(false);
  expect(ompMeetsMinimum("omp dev build")).toBe(false);
  expect(ompMeetsMinimum("18.12")).toBe(false);
});

test("the sentence for an omp that is too old names the minimum and the installed version, or says it is unknown, in English", () => {
  expect(ompTooOldText("18.12.5")).toBe("Trama needs omp 18.12.6 or later; the installed omp is 18.12.5.");
  expect(ompTooOldText(undefined)).toBe("Trama needs omp 18.12.6 or later; the installed omp is unknown.");
});
