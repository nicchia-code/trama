import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GetStartedTab } from "../extension/src/webview/getstarted";

afterEach(cleanup);

function tab(over: Partial<Parameters<typeof GetStartedTab>[0]> = {}) {
  const chosen: string[] = [];
  render(<GetStartedTab busy={false} error={null} choose={(c) => chosen.push(c)} openLink={() => {}} {...over} />);
  return chosen;
}

test("the notice and the two choices show, and each sends its choice", () => {
  const chosen = tab();
  expect(screen.getByText(".trama")).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /^Import from Code/ }));
  fireEvent.click(screen.getByRole("button", { name: /^Start from Scratch/ }));
  expect(chosen).toEqual(["import", "scratch"]);
});

test("while a choice is under way neither button can be pressed", () => {
  const chosen = tab({ busy: true });
  for (const button of screen.getAllByRole("button") as HTMLButtonElement[]) {
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
  }
  expect(chosen).toEqual([]);
});

test("a failed initialization shows its reason under the choices", () => {
  tab({ error: "no write access" });
  expect(screen.getByRole("alert").textContent).toBe("no write access");
});
