import { expect, test } from "bun:test";
import { ompVersionError, parseOmpVersion } from "../extension/src/host/omp-status";

test("the version is read from the first line of omp --version", () => {
  expect(parseOmpVersion("14.2.1\n")).toBe("14.2.1");
  expect(parseOmpVersion("\u001b[1momp/14.2.1-beta.2\u001b[0m\nmore")).toBe("14.2.1-beta.2");
  expect(parseOmpVersion("omp dev build")).toBe("omp dev build");
  expect(parseOmpVersion("  \n")).toBeUndefined();
});

test("the reasons omp --version fails", () => {
  const error = (props: object) => Object.assign(new Error("x"), props) as never;
  expect(ompVersionError(error({ code: "ENOENT" }), "/x/omp", 15_000)).toBe("omp not found at /x/omp");
  expect(ompVersionError(error({ killed: true }), "/x/omp", 15_000)).toBe("omp --version did not answer within 15 s");
  expect(ompVersionError(error({ code: 3 }), "/x/omp", 15_000)).toBe("omp exited with code 3");
  expect(ompVersionError(null, "/x/omp", 15_000)).toBe("omp --version did not return a version");
});
