import { describe, expect, test } from "bun:test";
import { toolLabel } from "../extension/src/webview/omp-chat/tool-logo";

describe("code cells: the prefix names the language", () => {
  test("[py] shows the Python logo and the title without the prefix", () => {
    const label = toolLabel("[py] print(1)", undefined);
    expect(label.title).toBe("print(1)");
    expect(label.logo?.name).toBe("Python");
    expect(label.logo?.path.length).toBeGreaterThan(0);
  });

  test("[js] shows the JavaScript logo", () => {
    expect(toolLabel("[js] console.log(1)", undefined).title).toBe("console.log(1)");
    expect(toolLabel("[js] console.log(1)", undefined).logo?.name).toBe("JavaScript");
  });

  test("an unknown prefix stays in the title with the icon for the type", () => {
    expect(toolLabel("[?] something", undefined)).toEqual({ title: "[?] something" });
  });

  test("a code cell's prefix is read only at the start of the title", () => {
    expect(toolLabel("run [py] now", undefined)).toEqual({ title: "run [py] now" });
  });
});

describe("shell commands: the icon for the type stays", () => {
  test("$ is removed from the title and no logo is shown", () => {
    expect(toolLabel("$ bun test", undefined)).toEqual({ title: "bun test" });
  });

  test("a shell command on a file with a known extension still shows no logo", () => {
    expect(toolLabel("$ cat a.py", "a.py")).toEqual({ title: "cat a.py" });
  });
});

describe("files: the logo comes from the extension, in any case", () => {
  const cases: Array<[string, string]> = [
    ["a.py", "Python"],
    ["a.js", "JavaScript"],
    ["a.mjs", "JavaScript"],
    ["a.cjs", "JavaScript"],
    ["a.jsx", "JavaScript"],
    ["a.ts", "TypeScript"],
    ["a.tsx", "TypeScript"],
    ["a.mts", "TypeScript"],
    ["a.cts", "TypeScript"],
    ["a.json", "JSON"],
    ["a.md", "Markdown"],
    ["a.html", "HTML"],
    ["a.htm", "HTML"],
    ["a.css", "CSS"],
    ["a.yml", "YAML"],
    ["a.yaml", "YAML"],
    ["a.rs", "Rust"],
    ["a.go", "Go"],
    ["a.java", "Java"],
    ["a.swift", "Swift"],
    ["a.kt", "Kotlin"],
    ["a.kts", "Kotlin"],
    ["a.c", "C"],
    ["a.h", "C"],
    ["a.cpp", "C++"],
    ["a.cc", "C++"],
    ["a.cxx", "C++"],
    ["a.hpp", "C++"],
    ["a.cs", "C#"],
    ["a.rb", "Ruby"],
    ["a.php", "PHP"],
    ["a.sh", "Shell script"],
    ["a.bash", "Shell script"],
    ["a.zsh", "Shell script"],
  ];
  for (const [path, name] of cases) {
    test(`${path} shows ${name}, and the title stays`, () => {
      expect(toolLabel("Read", path)).toEqual({ title: "Read", logo: expect.objectContaining({ name }) });
    });
  }

  test("the extension is read without regard to case", () => {
    expect(toolLabel("Read", "README.MD").logo?.name).toBe("Markdown");
    expect(toolLabel("Read", "Main.PY").logo?.name).toBe("Python");
  });

  test("the extension of the basename counts, in a path with folders or Windows separators", () => {
    expect(toolLabel("Read", "src/lib/a.ts").logo?.name).toBe("TypeScript");
    expect(toolLabel("Read", "src\\lib\\a.ts").logo?.name).toBe("TypeScript");
    expect(toolLabel("Read", "src.d/file")).toEqual({ title: "Read" });
  });

  test("a file without a known type keeps the icon for its type", () => {
    expect(toolLabel("Read", "a.txt")).toEqual({ title: "Read" });
    expect(toolLabel("Read", "a.toml")).toEqual({ title: "Read" });
    expect(toolLabel("Read", "Makefile")).toEqual({ title: "Read" });
    expect(toolLabel("Read", ".py")).toEqual({ title: "Read" });
  });

  test("names that are properties of Object are not logos", () => {
    expect(toolLabel("Read", "a.constructor")).toEqual({ title: "Read" });
    expect(toolLabel("Read", "a.toString")).toEqual({ title: "Read" });
  });

  test("a call with no file and no prefix keeps the title and the icon for its type", () => {
    expect(toolLabel("Edit", undefined)).toEqual({ title: "Edit" });
  });
});
