# UAT: Trama VS Code extension

Manual acceptance test, step by step. Every row is one action with one observable result. Expected values were read from the running views and from the CLI on the seeded demo, so they are exact. Mark the last column with ✓ (pass), ✗ (fail) or `~` (different from expected: write what you saw underneath).

## Automated run

A real VS Code (code-oss, same extension build, fish shell) was driven through the Chrome DevTools protocol, with the agent command replaced by a `printf >> file` so every launch could be counted and read back. The webview was also exercised in headless Chrome against the same bundle. Each result below says how it was obtained.

**Passed, and how it was driven**

| Area | Rows | Input used |
|---|---|---|
| Board text, badges, columns | E1 to E3 | Read from the DOM |
| Navigation from the board to the Diagram | E4 | DOM `.click()` on chips and links |
| Live updates and error banners | F1 to F7, F9, F10 | Files written from outside; DOM read. **F8 was not run** |
| Developer decisions | G1 to G10 | Buttons activated with DOM `.click()`; input boxes typed with real key events; results read from the files on disk |
| Agent launches | H1 to H19 | Buttons with DOM `.click()`; prompts read back from the log file |
| Empty project | J1 to J10 | Notification and modal buttons with DOM `.click()` |
| Keyboard focus rings | K4 | Real Tab key events, computed outline read |
| Canvas interactions | B2.1, B2.3, B3.2, B5, B6.2, B6.3, B10.1 to B10.3, B10.5, B10.6, B11.1, D1, D2 | Real mouse and key events sent to the webview at node positions read from the Cytoscape instance |
| Wheel zoom | B10.4 | In VS Code only a scripted `WheelEvent` (it moved the zoom by about 1 %). With a real wheel in headless Chrome the direction is right (3 ticks up: 1.200 to 1.242; 6 ticks down: 1.186), about 1.2 % per tick |

Buttons were activated through the DOM, not clicked with the real mouse, so a button that is covered, clipped or too small to hit is not covered by this run.

**Still to do by eye, or with a real agent:** B2.2, B4.6 (hover tooltips), B7.1 and B8.2 and C6.3 (how sub-States, the State level and a removed State look in VS Code; seen in Chrome only), B10.4 (does the wheel feel right), B10.9 and K3 (readability when wide or narrow), C4.2, D3.3, E5.2 with a real mouse in VS Code, F8, K1 for the Feature level in a light theme and the State level in both themes, a real-mouse click on each button, and all of part I.

**Findings:** (1) deleting and recreating `.trama/` made VS Code's file watcher stop reporting changes in some subfolders, so the demo reset now updates files in place; (2) the last breadcrumb is a button with `aria-current="page"`, clicking it does nothing, so B9.3 means "marked as current".


## 0. Conventions

- **↻ reset** means: run the reset command (S1). It restores the seeded state in about a second. It deletes every change you made under `.trama/` of the demo and leaves `.vscode/` and `.agents/` alone.
- **verification shell**: a normal terminal **outside** the Trama window, bash or zsh, with the two lines of S4 pasted. `j` points at this repo's build, so it never picks up an older `trama` from your PATH.
- **"the board"** is the Board tab. **"the panel"** is the right-hand side panel of the Diagram tab.
- Click means a single left click. Double-click means two quick clicks on the same node.
- Tests marked 🪙 spend model tokens. Everything else is free.
- Tests marked 🔍 are exploratory: the behaviour was never run, so note what you see even if it is not a failure.
- **Short numbers.** Wherever the panel or the command line names a Proposal, Task or Drift, it shows its temporary short number (`P1`, `T1`, `D1`) while the card is live, and its permanent identity only when it has no number (a closed card). Never both. The demo's cards are still named `NNNN-<slug>`, so they take their numbers in number order: Proposals 0001 and 0002 are `P1` and `P2`, Drifts 0001 and 0002 are `D1` and `D2`, Tasks 0001, 0002 and 0003 are `T1`, `T2` and `T3`; Task 0004 is Done and has no number. Rows written before short numbers still say "Proposal 0001", "Task 0003" and so on: they mean the same card, whose short number is the one in this list. The commands accept either form. Section U tests the numbers themselves.

## 1. Setup

| # | Action | Expected | ✓ |
|---|---|---|---|
| S1 | Run `cd /home/luca/Developer/Trama && TRAMA_DEMO_DIR=/tmp/trama-demo/shop bun run scripts/harness.ts` | Prints `wrote extension/dist/harness.html`. No error | ☐ |
| S2 | Run `printf '{\n  "trama.agentCommand": "echo {prompt}"\n}\n' > /tmp/trama-demo/shop/.vscode/settings.json` | File contains `"trama.agentCommand": "echo {prompt}"`. From now on the "agent" only prints its prompt | ☐ |
| S3 | Run `code --extensionDevelopmentPath=/home/luca/Developer/Trama/extension --new-window /tmp/trama-demo/shop` (skip if the window is already open) | A VS Code window titled `shop`. If a Welcome dialog appears, close it | ☐ |
| S4 | In the verification shell paste: `j() { /home/luca/Developer/Trama/dist/trama --root /tmp/trama-demo/shop "$@"; }` and `D=/tmp/trama-demo/shop/.trama` | No output. `j board` prints the board (see S5) | ☐ |
| S5 | Run `j board` | `To decide`: Proposal `P1`, Proposal `P2`, Drift `D1`, Drift `D2` (Proposal `P2`). `To do`: `T1`, `T2`. `In progress`: `T3`. `Done`: `0004` (its identity, because it has no number) | ☐ |

## 2. The seeded demo (reference)

| Thing | Content |
|---|---|
| Actors | `courier` (1 Event: PICKED_UP), `stripe` (3: CHARGE_OK, CHARGE_FAILED, REFUND_DONE), `user` (3: ADD_ITEM, CHECKOUT, CANCEL), `warehouse` (1: PACKAGE_READY) |
| Feature `checkout` | Machines `cart` (3 States), `order` (8), `payment` (6) |
| `order` States | Draft (initial), Awaiting payment, Paid [Preparing (initial), Ready to ship], Refunding, Shipped (final), Cancelled (final) |
| Proposal 0001 "Returns after shipping" | `actors/user.md` (+1), `checkout/order.md` (+2 ~2), `checkout/return.md` (+5, new Machine) |
| Proposal 0002 "Orders can be lost in transit" | `checkout/payment.md` (+1: State `Written off (final)`) |
| Drift 0001 | "Code refunds after the package is picked up", points at `order/Shipped`, no Proposal; its texts use **bold**, *italic*, a bulleted list and a link, it has two fix options, **Refuse the refund** (recommended; its text has bold and a bulleted list) and **Refund only after the return**, and a Where in the code section (two files) |
| Drift 0002 | "Code has a Written off payment", points at `payment`, Proposal 0002 attached, two fix options **Change the code** (recommended) and **Remove the code** |
| Task 0001 To do | "Implement refunds for prepared orders", refs `order/Refunding`, `order/Paid/user.CANCEL`; its body is Markdown (an introduction, a two-item list with bold, an inline code span) |
| Task 0002 To do | "Payment declined email", ref `order/Awaiting payment/payment.DECLINED` |
| Task 0003 In progress | "Cart confirmation", ref `cart/Has items/user.CHECKOUT` |
| Task 0004 Done | "Upgrade dependencies", technical |
| Requirement Areas | `data` (fragment `main`: sections order, payment) and `ui` (fragment `main`: General, checkout, order/Paid), each a folder with `area.md` |

---

## A. Opening the panel

### A1. First open
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Press Ctrl+Shift+P, type `Trama`, look at the list | Among them: **Trama: Open**, **Trama: Initialize Project**, **Trama: Quick Design Request…**, **Trama: Design…**, **Trama: Scan System**. **Trama: Send to agent (closing the tab sends it too)** is not in the list | ☐ |
| 2 | Run **Trama: Open** | One new editor tab titled `Trama`, in the editor area | ☐ |
| 3 | Look at the tab header inside the panel | Two tabs: **Diagram** (selected, underlined) and **Board** with a grey badge `4` | ☐ |
| 4 | Look under the tabs | No red banner | ☐ |
| 5 | Look at the Diagram breadcrumb | Only `System` | ☐ |
| 6 | Run **Developer: Open Webview Developer Tools** (palette) and open its Console tab | No red errors. A yellow `custom wheel sensitivity` warning from Cytoscape is expected and harmless. No `Content Security Policy` violation | ☐ |

### A2. Open twice
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | With the panel open in another editor tab, run **Trama: Open** again | The existing `Trama` tab is brought to front. There is still exactly one `Trama` tab | ☐ |

### A3. Close and reopen
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Close the `Trama` tab, run **Trama: Open** | A new tab opens at the System level with the current data | ☐ |

### A4. State survives tab switching
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Diagram: drill to `checkout › order` (see B3–B5) and choose Proposal `0001` in the selector | Breadcrumb `System › checkout › order`, selector shows `0001 · Returns after shipping` | ☐ |
| 2 | Click the **Board** tab, then the **Diagram** tab | Same breadcrumb, same selector value, same zoom and pan as before | ☐ |
| 3 | Open another editor tab, come back to `Trama` | Same as above; the diagram is not blank or redrawn from the start | ☐ |

### A5. Reload window 🔍
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | With the panel open, run **Developer: Reload Window** | Not specified. Note whether the panel comes back or disappears. If it disappears, **Trama: Open** must open it again with the right data | ☐ |

---

## B. Diagram: levels and navigation

### B1. System level
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Open the Diagram at the System level, selector `None` | Four purple pill nodes on the left, top to bottom: `Courier · 1 event`, `Stripe · 3 events`, `User · 3 events`, `Warehouse · 1 event` | ☐ |
| 2 | Look at the box on the right | `Checkout` with the text `3 machines · ⚠ 2 drifts inside`, a **red** outline, and a small ↗ icon at its right edge | ☐ |
| 3 | Look at the edges | Four grey edges Actor → Checkout, labelled `1` (Courier), `3` (Stripe), `3` (User), `1` (Warehouse) | ☐ |
| 4 | Look under Checkout | Two red dashed pill nodes `Drift 0001` and `Drift 0002`, each with a dashed red edge going up to Checkout | ☐ |
| 5 | Look at the toolbar | Left: `System`. Right: `Proposal` selector, buttons `−`, `+`, `Fit`, `Quick request…`, `Design…`, `Scan`. Hovering `Quick request…` shows `Ask an agent to design a change in one line`, hovering `Design…` shows `Write a design request in Markdown and send it to an agent` | ☐ |
| 6 | Look at the panel | `SYSTEM`, `Shop`, `An online shop selling printed books to private customers.`, then `FEATURES` with the link `Checkout` and `3 machines` under it | ☐ |
| 7 | Look at the bottom-left legend | `Legend` (collapsible, open) with six entries: Proposal adds it, Proposal removes it, Proposal changes it, Drift, Initial State, Final State | ☐ |
| 8 | Click the `Legend` header | It collapses to its title; click again to expand | ☐ |

### B2. Inspect a Feature
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Click the `Checkout` box once | The box gets a blue outline and a darker blue fill. The panel shows `FEATURE`, `Checkout`, `From a filled cart to a delivered order, including payment and cancellation.`, buttons **Drill in** and **Open file**, then `MACHINES`: `cart · 3 states`, `order · 8 states`, `payment · 6 states` | ☐ |
| 2 | Hover the box | A tooltip with the description appears | ☐ |
| 3 | Click an Actor node, for example `User` 🔍 | Not observed. By design the panel shows that Actor and its Events, and nothing is drilled into | ☐ |
| 4 | Press Escape with the diagram focused | Selection is cleared; the panel goes back to the System description | ☐ |

### B3. Three ways to drill in
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Select Checkout, click **Drill in** in the panel | Feature level. Breadcrumb `System › checkout` | ☐ |
| 2 | Click `System` in the breadcrumb, then double-click the Checkout box | Same result | ☐ |
| 3 | Click `System` in the breadcrumb, then click the ↗ icon on the Checkout box | Same result | ☐ |

### B4. Feature level
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Look at the left border | Four **dimmed** Actor nodes: `User`, `Warehouse`, `Courier`, `Stripe`. Dimmed means they live outside this Feature | ☐ |
| 2 | Look at the Machines | `Cart · 3 states`, `Payment · 6 states`, `Order · 8 states · ⚠ 1 drift inside`. Order and Payment have a **red** outline | ☐ |
| 3 | Read all the edge labels | `ADD_ITEM, CHECKOUT` (User → Cart), `CONFIRM` (Cart → Order), `CANCEL` (User → Order), `PACKAGE_READY` (Warehouse → Order), `PICKED_UP` (Courier → Order), `CHARGE_OK, CHARGE_FAILED +1` (Stripe → Payment), `SUCCEEDED, DECLINED +1` (Payment → Order), `CONFIRMED, REFUND_REQUESTED` (Order → Payment). Eight edges, no overlapping labels | ☐ |
| 4 | Look at the Drifts | `Drift 0001` is joined by a dashed red edge to Order; `Drift 0002` to Payment | ☐ |
| 5 | Click `Order` once | Panel `MACHINE`, `Order`, description, **Drill in**, **Open file**, `STATES` (Draft initial, Awaiting payment, Paid, Refunding, Shipped final, Cancelled final), `EVENTS IT EMITS`: `CONFIRMED … received by payment/Idle` and `REFUND_REQUESTED … received by payment/Paid` | ☐ |
| 6 | Hover `Order` | Tooltip listing the States and Events | ☐ |

### B5. Machine level (`order`)
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | From Feature level double-click `Order` | Breadcrumb `System › checkout › order`. Panel `MACHINE`, `Order`, description, **Open file** | ☐ |
| 2 | Look at the States | Left to right: a filled **dot** (initial) with an arrow into `Draft`; `Awaiting payment`; `Paid` with the text `2 sub-states`, a ▶ icon and a ↗ icon; `Refunding`; `Shipped`; `Cancelled` | ☐ |
| 3 | Look at the final States | `Shipped` and `Cancelled` have a **double border** | ☐ |
| 4 | Read the edge labels | `cart.CONFIRM`, `payment.SUCCEEDED`, `payment.DECLINED`, `user.CANCEL` (twice, from Paid: to Cancelled and to Refunding), `courier.PICKED_UP` (Paid → Shipped), `payment.REFUNDED` (Refunding → Cancelled). Seven edges | ☐ |
| 5 | Look at Shipped | Red outline, with a red dashed `Drift 0001` ghost joined by a dashed red edge | ☐ |

### B6. Inspect a State and a Transition
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Click `Draft` | Panel `STATE (INITIAL)`, `Draft`, `The customer is still choosing what to buy.`, **Open file**, `TRANSITIONS`: `cart.CONFIRM → Awaiting payment` with `only if the cart is not empty.` below | ☐ |
| 2 | Click the edge label `cart.CONFIRM` | The edge turns blue. Panel `TRANSITION`, `Draft → Awaiting payment · cart.CONFIRM`, **Open file**, `cart.CONFIRM: Draft → Awaiting payment`, `only if the cart is not empty.` A tooltip with the same text shows | ☐ |
| 3 | Click an empty area of the canvas | Selection clears, the panel goes back to the Machine | ☐ |

### B7. Expand and collapse a State
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Click the ▶ icon on `Paid` | `Paid` becomes a large box titled `Paid` containing a dot, `Preparing`, an edge `warehouse.PACKAGE_READY`, and `Ready to ship`. The icon turns into ▼ | ☐ |
| 2 | Look at the edges leaving Paid | They now start from the box or from `Ready to ship` (`courier.PICKED_UP` to Shipped); the two `user.CANCEL` edges still start from the Paid box | ☐ |
| 3 | Click the ▼ icon | `Paid` collapses back to `2 sub-states` | ☐ |

### B8. State level (`Paid`)
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Click the ↗ icon on `Paid` | Breadcrumb `System › checkout › order › Paid` | ☐ |
| 2 | Look at the canvas | A dot → `Preparing` → edge `warehouse.PACKAGE_READY` → `Ready to ship` → edge `courier.PICKED_UP` → `Shipped`. `Shipped` is **dimmed**: it is outside this sub-machine | ☐ |
| 3 | Look at the panel | `STATE`, `Paid`, **Open file**, `TRANSITIONS (APPLY TO EVERY SUB-STATE)`: `user.CANCEL → Cancelled` (`only if nothing has been prepared yet; refunds the customer.`) and `user.CANCEL → Refunding` (`once preparation has started.`) | ☐ |
| 4 | The inherited `user.CANCEL` Transitions | They are listed in the panel only, **not drawn** on the canvas | ☐ |

### B9. Breadcrumb
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | From the State level click `order` | Machine level of `order` | ☐ |
| 2 | Click `checkout` | Feature level | ☐ |
| 3 | Click `System` | System level. The last segment is bold and not clickable | ☐ |

### B10. Zoom and pan
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | At the Machine level click `+` three times | The diagram gets larger each time, up to a maximum | ☐ |
| 2 | Click `−` several times | Smaller each time, down to a minimum (it cannot vanish) | ☐ |
| 3 | Click `Fit` | The whole diagram is framed again | ☐ |
| 4 | Scroll the mouse wheel over the canvas | Zooms around the pointer | ☐ |
| 5 | Drag the empty background | The diagram pans | ☐ |
| 6 | Click the canvas to focus it, press `+`, `-`, `0` | Zoom in, zoom out, fit | ☐ |
| 7 | Navigate to another level | It is framed with Fit automatically | ☐ |
| 8 | Stay at the Machine level at a custom zoom and edit any file under `.trama/tasks/` (see F1) | The zoom and pan do **not** reset when the data refreshes | ☐ |
| 9 | Zoom out at the Machine level of `order` | Labels on a wide graph get small. Note it (known flaw): readable after zooming in | ☐ |

### B11. The Diagram is read-only
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Try to drag a State node | The node does **not** move (only the background pans) | ☐ |
| 2 | Try to double-click a State label to rename it, right-click, drag from a node to create an edge | Nothing is created or renamed | ☐ |

### B12. Open file buttons
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Machine level, **Open file** in the panel | `checkout/order.md` opens in a text editor beside the panel, showing `# Order` | ☐ |
| 2 | Feature level, select Checkout, **Open file** | `checkout/feature.md` opens | ☐ |
| 3 | System level, select an Actor, **Open file** 🔍 | By design `actors/<id>.md` opens. Not observed: note if the button is missing | ☐ |

---

## C. Proposals on the Diagram

### C1. The selector
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Open the `Proposal` dropdown | `None`, `0001 · Returns after shipping`, `0002 · Orders can be lost in transit`. No warning marks | ☐ |
| 2 | Choose `0001` | The diagram redraws with ghosts (see below) and the panel shows the Proposal | ☐ |
| 3 | Choose `None` | All ghosts vanish; the panel shows the previous selection or the level | ☐ |

### C2. Proposal 0001 at the System level
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | System level, choose `0001` | `User` now reads `4 events` and has a **solid blue** outline; the edge User → Checkout is blue and labelled `4`; `Courier → Checkout` is blue too (the new Machine `return` listens to `courier.PICKED_UP`); Checkout reads `4 machines` with a blue outline | ☐ |
| 2 | Look at the panel | `ACTOR EVENTS CHANGED BY THE PROPOSAL`: `user.RETURN` with a small `added` label; below it the Proposal card | ☐ |

### C3. Proposal 0001 at the Feature level
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Feature level, choose `0001` 🔍 | By design a **dashed blue** node `Return` appears and Order gets a solid blue outline. Not observed at this level: note what you see | ☐ |
| 2 | Look at the new edges 🔍 | By design `user.RETURN` edges toward Return | ☐ |

### C4. Proposal 0001 at the Machine level
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Machine level `order`, choose `0001` | `Returned` appears as a blue-tinted State (added) at the right of `Shipped`, joined to it by a dashed blue edge | ☐ |
| 2 | Look at `Shipped` | Solid blue **and** red outline (changed by the Proposal, and Drift 0001 inside); it is no longer final (single border) | ☐ |
| 3 | Look at the edges | A new dashed blue edge `user.RETURN` from Shipped to Returned; the edge `user.CANCEL` from Paid to Refunding is solid blue (changed) | ☐ |

### C5. The Proposal card in the panel
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | With `0001` selected read the panel | Dashed-border card `PROPOSAL 0001`, title `Returns after shipping`, body `Customers may send a shipped order back.`, then `CHANGES` | ☐ |
| 2 | Read the changes | `actors/user.md (modified)`: `+ Event RETURN`. `checkout/order.md (modified)`: `~ State Shipped: no longer final, description changed`, `+ State Returned (final)`, `~ Transition Paid \| user.CANCEL → Refunding: prose changed`, `+ Transition Shipped \| user.RETURN → Returned: within 30 days; refunds the customer.` `checkout/return.md (added)`: States Requested (initial), In transit, Received (final) and two Transitions | ☐ |
| 3 | Look at the buttons | **Approve** (blue, enabled) and **Reject** | ☐ |

### C6. A Proposal that removes things
Setup: ↻ first. Use the new Proposal's ID from the output below as `<id>`. In the verification shell (the panel refreshes by itself):
```
j proposal new "Drop refunds" --body "Refunds are out of scope."
F=$(j --json proposal edit <id> checkout/order.md | jq -r .path)
sed -i '/^### Refunding/,/^### Shipped/{/^### Shipped/!d;}' "$F"; sed -i '/→ Refunding/d' "$F"
j proposal submit <id>
j proposal show <id>
```
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Read the output of `j proposal show <id>` | Status open; changes list `- State Refunding`, `- Transition Paid \| user.CANCEL → Refunding…`, `- Transition Refunding \| payment.REFUNDED → Cancelled`; `Valid.` | ☐ |
| 2 | Board tab | The submitted Proposal is in To decide; the existing draft remains outside the decision count | ☐ |
| 3 | Diagram, Machine level `order`, choose `<id> · Drop refunds` | `Refunding` is **faded** with a dashed red border and the word `removed`; the edges into and out of it are dashed red | ☐ |
| 4 | Look at the panel | `- State Refunding` and the two removed Transitions listed; **Approve** enabled | ☐ |
| 5 | ↻ reset when done | The new Proposal is gone | ☐ |

### C7. An invalid Proposal
Setup: ↻ first. Use the new Proposal's ID as `<id>`. In the verification shell:
```
j proposal new "Drop the cart"
j proposal delete <id> checkout/cart.md
j validate --proposal <id>       # exit code 1
j proposal submit <id>           # exit code 1; stays Draft
```
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Read the shell output | Validation and submission report `Event reference to unknown owner "cart"` | ☐ |
| 2 | Open the Diagram selector | No entry for the Draft | ☐ |
| 3 | `j proposal show <id>` | Status draft, the validation error and the removed cart are listed | ☐ |
| 4 | Board tab | No card for the Draft anywhere on the Board, and no Discard button | ☐ |
| 5 | `j board`, then `j proposal discard <id>` | `j board` lists the Draft under **In writing** marked `(draft)`; after the discard it is marked discarded and never enters To decide | ☐ |
| 6 | ↻ reset when done | | ☐ |

---

## D. Drifts on the Diagram

### D1. A Drift without a Proposal
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Machine level `order`, click the red `Drift 0001` ghost | Panel `DRIFT 0001`, title `Code refunds after the package is picked up`, two boxes: **WHAT HAPPENS** with `A shipped order is still refunded after the courier has picked the package up.` (**shipped** in bold) and a two-item bulleted list, and **WHAT SHOULD HAPPEN** `Model` with `A shipped order can no longer be refunded…` (bold) and a `the refund policy` link; under the boxes a collapsed block **Where in the code**; `POINTS AT` `order/Shipped` | ☐ |
| 2 | Look at the buttons and the lines under them | Each box has one **Keep this**. Under the left one `Closes the Drift; nothing changes`, under the right one (blue) `A Task is created for the agent to fix the code with the chosen option`. No Fix code, Accept Proposal or Dismiss | ☐ |
| 3 | Click **Where in the code**; select another element and select the Drift again | It opens across the whole width under the two boxes and lists `src/refund.ts` and `src/courier.ts` as code; after selecting the Drift again it is closed. It never holds anything the Keep this buttons depend on | ☐ |
| 4 | Click the link in **WHAT SHOULD HAPPEN** (harness: `window.__posts`) | The webview does not navigate; it posts `{ type: "openLink", url: "https://example.com/policy" }`. In VS Code the system browser opens the address | ☐ |
| 5 | Look at the right box between its text and **Keep this** | A group headed **FIX OPTIONS** with two radio buttons: **Refuse the refund** `(recommended)`, selected, with its text (bold, bulleted list), and **Refund only after the return**; under it a multi-line field labelled `Note (optional)`. The left box has neither | ☐ |
| 6 | Click **Refund only after the return**; then in the group press the up and down arrow keys | Exactly one option is selected each time; the arrows move the selection. Leave **Refund only after the return** selected | ☐ |
| 7 | Read the accessible names (`ariaSnapshot` or the browser's accessibility tree) | The right button is `Keep what should happen for Code refunds after the package is picked up with option Refund only after the return` and changes with the selection; the left one is `Keep what happens for …`; the group is `Fix options for Code refunds after the package is picked up` and the field `Note for Code refunds after the package is picked up` | ☐ |
| 8 | Type `Keep the audit log` in the note, select another element and select the Drift again | The selection and the text are as you left them (they survive refreshes of the Diagram and the Board during the session); closing and reopening the panel forgets them | ☐ |
| 9 | Click the right **Keep this** (harness: `window.__posts`) | It posts `{ type: "resolveDrift", id: "0001", how: "fix-code", option: 2, note: "Keep the audit log" }`; with an empty note the `note` field is absent. The left **Keep this** posts `{ type: "resolveDrift", id: "0001", how: "dismiss" }` with neither | ☐ |

### D2. A Drift with an attached Proposal
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | System level, click `Drift 0002` | Panel shows `DRIFT 0002`, `Code has a Written off payment`, the two boxes, `POINTS AT` `payment`. The left **Keep this** says `Approves Proposal 0002 and changes the Model to match` | ☐ |
| 2 | Look at the selector | It switched to `0002 · Orders can be lost in transit` | ☐ |
| 3 | Go to `checkout › payment` | A dashed blue `Written off` final State is visible | ☐ |

### D3. Drifts at other levels
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Feature level | A Drift ghost is attached to each of Order and Payment, and both have the red outline | ☐ |
| 2 | Machine level `cart` | No Drift ghost (no Drift points at it) | ☐ |
| 3 | Machine level `payment` 🔍 | Drift 0002 points at the Machine itself. Note how it is drawn (the code shows a ghost with no edge) | ☐ |

---

## E. Board

### E1. Layout
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Click the **Board** tab | Toolbar: **Run all To do** (blue), **Scan System**, **Quick request…**, **Design…**, with the same tooltips as in B1.5 | ☐ |
| 2 | Look at the columns | `TO DECIDE 4`, `TO DO 2`, `IN PROGRESS 1`, `DONE 1`, each with a count badge | ☐ |

### E2. To decide
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Read the first card | `Proposal 0001`, `Returns after shipping`, rows `actors/user.md +1`, `checkout/order.md +2 ~2`, `checkout/return.md +5`, buttons **View on diagram**, **Approve** (blue), **Reject**; a blue left border | ☐ |
| 2 | Read the second card | `Proposal 0002`, `Orders can be lost in transit`, `checkout/payment.md +1` | ☐ |
| 3 | Read the third card | `Drift 0001`, title, chip `order/Shipped`, the two boxes with their **Keep this** buttons and lines, the **Fix options** group and the note field in the right box, **View on diagram**; a red left border | ☐ |
| 4 | Read the fourth card | `Drift 0002`, chip `payment`, a link `Proposal 0002 attached`, the two boxes; the left line says `Approves Proposal 0002 and changes the Model to match`; **View on diagram** | ☐ |

### E3. Task cards
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Read `0001` in To do | Title `Implement refunds for prepared orders`, chips `order/Refunding` and `order/Paid/user.CANCEL`, no excerpt, buttons **Show details**, **Run** (blue) and **Open**, and no move arrows | ☐ |
| 1b | Click **Show details** on `0001` | The body shows as Markdown in the card: `When a paid order is cancelled after preparation has started:`, a two-item list with **refunded** in bold, and `order/Refunding` in a code span; the button reads **Hide details** and its accessible name is `Hide details of task 0001` | ☐ |
| 1c | With the details open, make the Board refresh (`j task move 2 doing`) | `0001` stays open. Closing the panel and reopening it shows every card closed again | ☐ |
| 1d | Read `0002` in To do | No **Show details** button (the Task has no body). Task rows inside a design card have no details toggle either | ☐ |
| 2 | Read `0004` in Done | Badge `technical`, no chips, only **Open**, no move buttons | ☐ |
| 3 | Read `0003` in In progress | Chip `cart/Has items/user.CHECKOUT`, no move buttons | ☐ |

### E4. Links into the Diagram
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Proposal 0001 card: **View on diagram** | The Diagram tab opens with `0001` selected in the selector | ☐ |
| 2 | Board, Task 0001: click the chip `order/Refunding` 🔍 | By design the Diagram opens at `order`, breadcrumb `System › checkout › order`, and the State `Refunding` is selected. Not observed | ☐ |
| 3 | Board, Drift 0002: click `Proposal 0002 attached` | Diagram opens with `0002` selected | ☐ |
| 4 | Board, Drift 0001: **View on diagram** 🔍 | By design the Diagram opens at `order` with `Shipped` selected. Not observed | ☐ |
| 5 | Board, Task 0001: click the chip `order/Paid/user.CANCEL` 🔍 | By design the Diagram opens at `order` with the Transition(s) of Paid on `user.CANCEL` selected. Not observed: note what you see | ☐ |

### E5. The Board has no way to move a Task
Needs the agent of E12 for row 6 (`trama.agentCommand` as `bash -c "sleep 600" {prompt}`); the other rows need none.
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | ↻. Look at every Task card, every Task row of a design card and every design card | No ← → buttons, no **Take back** button and no button that removes a card; no card has the `draggable` attribute | ☐ |
| 2 | Try to drag Task 0001 over In progress, over To decide and over its own column | Nothing is dragged: no outline appears on any column and `grep column $D/tasks/0001-*.md` still says `column: todo` | ☐ |
| 3 | Press Tab through the Board | Focus reaches only **Show details**, **Run**, **Open**, **Run this design**, the design card's toggle, the links and badges, and the buttons of Proposals and Drifts; none of them moves a Task | ☐ |
| 4 | `j task move 1 doing` | Within about a second the card is in In progress. At no moment is it dimmed or marked busy, and no error appears | ☐ |
| 5 | `TRAMA_AGENT=1 j task move 2 doing` | The dot of Task 0002 pulses in the accent colour and its label is `Agent working`; there is no badge and no **Take back** button. **Run all To do** is disabled with the tooltip `An agent is working on Task 0002` | ☐ |
| 6 | `j task move 2 done` (as the developer), then `j task take-back 2` | The first is refused: the message says the agent is working on Task 0002 and points to `trama task take-back 2` only. The second clears the mark: the dot stops pulsing, Task 0002 stays In progress and **Run all To do** is enabled again | ☐ |
| 7 | Start an agent that does not end by itself (E12), `TRAMA_AGENT=1 j task move 2 doing`, then press Ctrl+C in the **Design** terminal | Task 0002 goes back to To do with its dot no longer pulsing; no Take back is needed | ☐ |

### E8. Open a Task
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Task 0003: **Open** | `tasks/0003-cart-confirmation.md` opens beside the panel, front matter with `column: doing` | ☐ |

### E9. Badges
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Do F4 (stale) and look at the Proposal 0001 card | Orange badge `stale`; **Approve** disabled; hover shows a tooltip naming `checkout/order.md` | ☐ |

### E10. A design's Tasks as one card
↻ first. Then seed it from the verification shell (the Proposal only has to exist): `trama --root $D task new "Return request" --ref order --proposal 1`, then the same with `"Refund on return"` and `"Return label"`. Checked in the browser harness with a hand-made snapshot; not yet run inside VS Code.
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Look at the Board after the three commands | The three Tasks are **one** card in To do: `Proposal 0001`, a badge `0/3 done`, the title `Returns after shipping`, buttons **Run this design** (blue) and **Show 3 tasks**; no separate cards for the three Tasks | ☐ |
| 2 | Click **Show 3 tasks** | The button reads **Hide tasks**; three rows in creation order, each with a status dot, its ID and its title, and no buttons. Hovering a dot shows `To do` | ☐ |
| 3 | `j task move <id of the first row> doing` | Within about a second the row's dot changes to `In progress`; the card moves to the In progress column, stays open, and its badge still says `0/3 done` | ☐ |
| 4 | `j task move <id of the first row> done` | Badge `1/3 done`, the row's dot is `Done`; the card stays in In progress (a mix of To do and Done) | ☐ |
| 5 | Edit any file under `$D/tasks/` from outside (see F1) | The card stays open and in place after the refresh | ☐ |
| 6 | Try to drag the card onto another column | It cannot be dragged; nothing moves | ☐ |
| 7 | **Run this design** | The launch prints ``Use the trama-implement skill on every Task of Proposal 0001 that is in the "todo" column. Take them from `trama task next --batch --proposal 0001`, one group at a time, until it says there is none.`` | ☐ |
| 8 | `j task move <id> done` for the other two Tasks | The card moves to Done, badge `3/3 done`, **Run this design** is disabled with the tooltip `No Task of this design is in To do` | ☐ |
| 9 | Close the panel and open it again | The card is closed again | ☐ |
| 10 | `trama --root $D board` and `trama --root $D task list` | `board` lists `Proposal 0001 "Returns after shipping" (3/3 done)` once, in Done, with the three Tasks under it and their columns; `task list` lists the three Tasks flat, each with `(Proposal 0001)` | ☐ |
| 11 | Create a fourth Task with `--proposal 2` only (a second Proposal) | A design of one Task stays a plain card | ☐ |

### E11. Blocked Tasks
↻ first. Seed it from the verification shell: `j drift new "Refund amount differs" --ref order/Refunding --task 1 --happens "The code refunds late." --should "The Model refunds at once." --option "Refund at once" --option-text "Refund when the order is cancelled." --option "Queue the refund" --option-text "Keep the queue but refund within a minute."`, then `j drift new "Cancel differs" --ref order/Paid --happens "The code cancels twice." --should "The Model cancels once." --option "Cancel once" --option-text "Ignore a second cancel." --option "Reject the second cancel" --option-text "Answer it with an error."`. The harness seed already has blocked Tasks too (Tasks inside the design card, Task `0008` waiting for the fix Task `0009`); the new Drifts are 0006 and 0007. Task `0005`, taken by the agent, also gets the badge `blocked 0006`: blocking does not release it.
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Look at Task `0001` on the Board | Red badges `blocked 0006` (the Drift filed with `--task 1`) and `blocked 0007` (it refs `order/Paid/user.CANCEL`, inside `order/Paid`); **Run** stays enabled | ☐ |
| 2 | Hover a badge, and read its accessible name | The tooltip says `Blocked by Drift 0006: Refund amount differs. Show it on the diagram.` | ☐ |
| 3 | Click `blocked 0006` | The Diagram tab opens at the `order` Machine with the red ghost `Drift 0006` selected and its panel shown | ☐ |
| 4 | `j task move 1 doing` as the developer (no `TRAMA_AGENT`) | It moves to In progress and keeps its badges: the developer is never refused | ☐ |
| 5 | `j task move 1 doing`, and the same with `TRAMA_AGENT=1 j task move 1 doing` | The first prints `Task 0001 is now doing`; the second is refused naming `Drift 0006 "Refund amount differs"` and `Drift 0007`, saying the developer must decide; the Task is unchanged | ☐ |
| 6 | `j board`, `j task list`, `j task show 1` | `(blocked by Drift 0006) (blocked by Drift 0007)` after the title; `task show` also lists `Blocked by Drift 0006: Refund amount differs` and the same for 0007 | ☐ |
| 7 | `j drift show 6` | It does not list Task 0001 | ☐ |
| 8 | Click **Keep this** under **WHAT SHOULD HAPPEN** on Drift 0006 | Task `0001` goes back to To do and its badges become `waiting 0010` and `blocked 0007`; clicking `waiting 0010` scrolls to the fix Task's card and focuses it | ☐ |
| 9 | Move the fix Task `0010` to Done and click **Keep this** under **WHAT HAPPENS** on Drift 0007 | Task `0001` has no badge any more | ☐ |
| 10 | `j --json drift show 7`, then `j drift new "x" --ref order --task 99 --happens a --should b --option A --option-text a --option B --option-text b` | The first has `"origin": null` (filed without `--task`) and the two texts; the second fails with `No Task with ID "99"` and creates nothing | ☐ |
| 11 | ↻, seed the two Drifts again, then `j task next`, then `j task list --column todo` | `Next Task: 0002 Payment declined email`: the lowest Task in To do that is not blocked, skipping `0001`. The command moved nothing: `task list` still shows `0001`, `0002`, `0006`, `0008` and `0009` in `todo` | ☐ |
| 12 | `j task next --proposal 3`, then `j task next --proposal 99` | The first prints `No Task is runnable in Proposal 0003.`, a blank line, `Still in To do:` and `- 0006 Return request (Proposal 0003) (blocked by Drift 0003)`, and exits with `0`. The second fails with `No Proposal with ID "99"` and exits with `1` | ☐ |
| 13 | `j task move 2 doing` as the developer (no `TRAMA_AGENT`), then `j task next` | The second prints `No Task is runnable.`, a blank line, `Still in To do:` and one line for each of `0001`, `0006`, `0008` and `0009`, each with its marks, for example `- 0008 Order confirmation email (waiting for Task 0009) (blocked by Drift 0005)`. It exits with `0` | ☐ |
| 14 | `j --json task next` | `"next": null` and a `waiting` list with the same four Tasks, each with its `blockedBy` | ☐ |

### E12. Ghosts of announced cards
Needs an agent that does not end by itself. Set `printf '{"trama.agentCommand": "bash -c \\"sleep 600\\" {prompt}", "trama.autoScan": false}\n' > /tmp/trama-demo/shop/.vscode/settings.json`, ↻, and reload the window so the extension reads the settings. `j` below is the verification shell's.
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Board: **Quick request…**, type `Add refunds after pickup`, Enter. Note the To decide count and the number on the Board tab | Within about a second a dashed, translucent skeleton appears in To decide after the last real Proposal and before the first Drift: kind `Proposal`, title `Add refunds after pickup`, the line `Preparing`, and a shimmer on its text lines | ☐ |
| 2 | Look at the To decide count and the number on the Board tab again | Both are as in row 1: a ghost is not counted | ☐ |
| 3 | Press Tab through the Board, then click the ghost | Focus never lands on it, the click does nothing, it has no buttons or links and cannot be dragged. Its accessible name is `Proposal the agent is creating, preparing: Add refunds after pickup` | ☐ |
| 4 | `ls -A $D/announcements` and `cat $D/announcements/*.md`, then `T=$(sed -n 's/^terminal: //p' $D/announcements/*.md)` | `.gitignore` and one `<id>.md` with `kind: proposal`, `source: request`, a `terminal:` line with six lowercase letters and digits (kept in `$T`) and the H1 `Add refunds after pickup`; `cat $D/announcements/.gitignore` prints `*` | ☐ |
| 5 | `j proposal new "Refunds after pickup"`; note the ID it prints, `<P>` | No note in the output. The same ghost (no second one) now reads title `Refunds after pickup` and the line `Writing` | ☐ |
| 6 | `j proposal submit <P>` | The ghost disappears and the real card of that Proposal stands in its place; the count and the badge go up by one; no notice appears | ☐ |
| 7 | `A=$(j announce task "Refund prepared orders")` | A ghost of kind `Task` and line `Preparing` stands in To do after the real cards, with the count of To do unchanged | ☐ |
| 8 | `j task new "Refund prepared orders" --ref order/Refunding --announcement $A` | The ghost gives way to the real card, at the same place; `ls -A $D/announcements` shows only `.gitignore` | ☐ |
| 9 | `j announce drift "Cart differs"` | A `Drift` ghost stands in To decide after the last real Drift. It belongs to no terminal (`terminal: null` in its file) | ☐ |
| 10 | `j task new "Unannounced" --ref order --announcement zzzzzz` | The Task is created and the output adds `No announcement "zzzzzz" was found …`; no ghost appears or is left | ☐ |
| 11 | `TRAMA_TERMINAL=$T j announce task "Left behind"`, then in the **Design** terminal press Ctrl+C | The `Task` ghost disappears at once. At the top of the Board one notice, `The agent finished without delivering Task Left behind.`, with a **Close** button. The `Drift` ghost of row 9 stays: it belongs to no terminal | ☐ |
| 12 | Click **Close** on the notice, switch to the Diagram tab and back | The notice is gone; closing the Trama tab and opening it again shows none | ☐ |
| 13 | `j proposal new "Never finished"`, read the ghost, then `j proposal discard <ID it printed>` | A `Writing` ghost titled `Never finished`; after the discard it disappears and **no** notice is shown | ☐ |
| 14 | `j announce task "Gone quiet"`, then edit its file under `$D/announcements` and set `touched` to a time 20 minutes ago, save | Within about 30 seconds the ghost disappears and the notice `The agent finished without delivering Task Gone quiet.` appears; the `Drift` ghost of row 9, which also belongs to no terminal, goes with it, with its own notice | ☐ |
| 15 | `j announce task "Before reload"`, then Developer: Reload Window and open the Board | The ghost is not there and no notice is shown: leftovers are withdrawn at startup | ☐ |
| 16 | Set `printf '{"trama.agentLauncher": "chat", "trama.autoScan": false}\n' > /tmp/trama-demo/shop/.vscode/settings.json`, reload, **Quick request…** with any text | The prompt goes to the chat (or the clipboard) and **no** ghost appears | ☐ |
| 17 | `j proposal new "From the chat"` | A `Writing` ghost titled `From the chat` appears: with the chat launcher the ghost starts with the Draft | ☐ |
| 18 | 🪙 With a real agent (section I) ask for a design that needs questions | While its question round is open every ghost reads `Waiting for your answers`; they go back to `Preparing` or `Writing` when the round closes | ☐ |
| 19 | Restore S2. ↻, then `j task move 1 doing` | The card moves to In progress without ever looking busy; no dashed copy of it appears in In progress at any moment | ☐ |
| 20 | `C=$(j announce check "Final check after all Tasks" --phase verifying)` | In In progress, dopo le schede vere, un ghost `Check` intitolato `Final check after all Tasks` con la riga `Verifying (tests, lint, build)`; il numero della colonna non cambia | ☐ |
| 21 | `j announce phase $C scanning`, poi di nuovo lo stesso comando | Il ghost passa a `Scanning`; il secondo comando dice che il controllo è già in Scanning | ☐ |
| 22 | `j announce done $C` | Il ghost sparisce e **nessun** avviso compare | ☐ |
| 23 | `j announce check "Scan of the System" --phase scanning`, poi impostare `touched` del suo file a 20 minuti fa e salvare | Entro circa 30 secondi il ghost sparisce e compare l'avviso `The agent stopped before finishing Scan of the System.` | ☐ |

---

## F. Live updates and errors

| # | Action | Expected | ✓ |
|---|---|---|---|
| F1 | ↻. Open `tasks/0004-upgrade-dependencies.md` in any editor, change `column: done` to `column: todo`, save | Within about a second, Task 0004 moves to To do (To do now has 3 cards, Done is empty and shows its empty hint). No reload. The Board badge stays `4` | ☐ |
| F2 | In the same file change `refs: []` to `refs: text`, save | A red banner appears under the tabs, naming `…/tasks/0004-upgrade-dependencies.md` and saying `"refs" must be a list of strings`. The board and diagram keep showing the last good data | ☐ |
| F3 | Change it back to `refs: []`, save | The banner disappears by itself | ☐ |
| F4 | ↻. In the verification shell run `echo >> $D/model/checkout/order.md` | Proposal 0001 gets the badge `stale`; **Approve** (Board and Diagram) is disabled. `j proposal list` prints `0001 [open, stale]` | ☐ |
| F5 | ↻. Add a new file with `printf '%s\n' '---' 'column: todo' 'technical: true' 'refs: []' 'drift: null' '---' '# Rebuild CI cache' > $D/tasks/0005-rebuild-ci-cache.md` | A new Task `0005` appears in To do within a second with the badge `technical`; counts update | ☐ |
| F6 | Delete that file | The card disappears | ☐ |
| F7 | Trigger any error banner (F2) and click the `×` | The banner hides | ☐ |
| F8 | ↻. In `model/checkout/order.md` remove the text ` (initial)` from `### Draft (initial)`, save 🔍 | No crash. The UI does **not** warn that the Model is invalid (no code shows Model errors). Note what you see. Run `j validate`: exit 1 with `The Machine must have exactly one (initial) State, found 0` | ☐ |
| F9 | ↻. Edit `proposals/0001-*/proposal.md`, change `status: open` to `status: bogus`, save | Red banner naming that file with `"status" must be one of open, approved, rejected` | ☐ |
| F10 | With the Trama tab hidden behind another tab, edit a Task file, then return to the Trama tab | The change is already shown | ☐ |

---

## G. Developer decisions (agent mode: echo, S2)

For every G test, ↻ first, then open the panel and the terminal panel.

### G1. Approve a Proposal from the Board
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Board: **Approve** on Proposal 0001 | The card leaves To decide (count 3). No error banner | ☐ |
| 2 | Look at the bottom panel | A terminal named **Scan** opens in the project folder | ☐ |
| 3 | Read the terminal | Exactly **one** command was sent and one line printed: ``Use the trama-scan skill on what Proposal 0001 changed: its scan scope is in `trama proposal show 0001`. Link every Task you file to it with --proposal 0001.``, senza nulla su trama-implement | ☐ |
| 4 | Verification shell: `j validate` | `The Model and its Requirements are valid.` | ☐ |
| 5 | `grep -c Returned $D/model/checkout/order.md` | `2` | ☐ |
| 6 | `ls $D/model/checkout` | `cart.md feature.md order.md payment.md return.md` | ☐ |
| 7 | `grep -n RETURN $D/model/actors/user.md` | A line `### RETURN` | ☐ |
| 8 | `grep status $D/proposals/0001-*/proposal.md` | `status: approved` | ☐ |
| 9 | Diagram, System level, selector `None` | User now has `4 events`; Checkout has `4 machines`; no ghosts for 0001 | ☐ |
| 10 | Selector | `0001` is no longer listed | ☐ |
| 11 | `j proposal show 1` | After `## Changes`, a `## Scan scope` section, one reference per line with `(changed)`, `(removed, its container)` or `(leads into a change)`, among them `` `return` (changed) ``; `j --json proposal show 1` has `scanScope` as a list of `{ ref, reason }` | ☐ |

### G2. Approve from the Diagram panel
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | ↻. Diagram, choose `0001`, click **Approve** in the panel | Same results as G1.1 to G1.10, with exactly one scan line in the terminal | ☐ |

### G3. Reject with feedback
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | ↻. Board: **Reject** on Proposal 0001 | An input box titled `Reject Proposal 0001`, prompt `Feedback for the agent (optional): what should the next Proposal do differently? Press Enter to reject without feedback, Esc to cancel.` | ☐ |
| 2 | Type `Split it by state`, press Enter | The card leaves To decide. No terminal is opened | ☐ |
| 3 | `grep status $D/proposals/0001-*/proposal.md` | `status: rejected` | ☐ |
| 4 | `tail -4 $D/proposals/0001-*/proposal.md` | A `## Feedback` heading followed by `Split it by state` | ☐ |
| 5 | `j validate` | The Model is unchanged and valid (order.md has no `Returned`) | ☐ |

### G3b. Reject without feedback
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | ↻. Board: **Reject** on Proposal 0001, press Enter with the box empty | The box accepts it. The card leaves To decide. No terminal is opened | ☐ |
| 2 | `grep status $D/proposals/0001-*/proposal.md` | `status: rejected` | ☐ |
| 3 | `grep -c Feedback $D/proposals/0001-*/proposal.md` | `0`: no Feedback section was added | ☐ |
| 4 | ↻. **Reject** on 0001, type spaces only, press Enter | The same: rejected, still no Feedback section | ☐ |

### G4. Cancel the rejection
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | ↻. **Reject** on 0001, press Esc | Nothing changes; the Proposal is still open | ☐ |

### G5. Accept a Drift's attached Proposal
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | ↻. Board: **Keep this** under **WHAT HAPPENS** on Drift 0002 | Both Drift 0002 and Proposal 0002 leave To decide (count 2) | ☐ |
| 2 | Read the terminal | Exactly **one** line: ``Use the trama-scan skill on the Feature `checkout`.`` | ☐ |
| 3 | `grep -n 'Written off' $D/model/checkout/payment.md` | A line `### Written off (final)` | ☐ |
| 4 | `sed -n 1,8p $D/drifts/0002-*.md` | `status: resolved`, `resolution: proposal`, `proposal: "0002"` | ☐ |
| 5 | `grep status $D/proposals/0002-*/proposal.md` | `status: approved` | ☐ |

### G6. Fix the code (Drift → Task)
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | ↻. Board: in Drift 0001 select **Refund only after the return**, type `Keep the audit log` in the note and click **Keep this** under **WHAT SHOULD HAPPEN** | Drift 0001 leaves To decide (count 3) | ☐ |
| 2 | Look at To do | A new card `0005` `Fix code to match the Model: Code refunds after the package is picked up`, chip `order/Shipped`, text `from Drift 0001` | ☐ |
| 3 | `ls $D/tasks` | Includes `0005-fix-code-to-match-the-model-code-refunds.md` | ☐ |
| 4 | `sed -n 1,8p $D/tasks/0005-*.md` | `column: todo`, `technical: false`, refs `order/Shipped`, `drift: "0001"` | ☐ |
| 5 | `sed -n 1,10p $D/drifts/0001-*.md` | `status: resolved`, `resolution: fix-code`, `task: "0005"`, `option: 2`, `note: Keep the audit log` | ☐ |
| 5b | `cat $D/tasks/0005-*.md` | The body holds, in this order, `## What happens`, `## What should happen`, `## Chosen option` (**Refund only after the return** with its text), `## Note` (`Keep the audit log`) and `## Where in the code` | ☐ |
| 5c | `j drift show 1` | After the two sides, `## Fix options` as a numbered list (`1. **Refuse the refund** (recommended)`, `2. …`), the Where in the code, then `## Chosen option` `2. Refund only after the return` and `## Note` | ☐ |
| 6 | Terminal | Nothing was launched | ☐ |

### G6b. Fix options on the command line
Seed a Drift: `j drift new "Cli fix" --ref order --happens "The code does it." --should "The Model says so." --option "Change it" --option-text "Make the code do it." --option "Drop it" --option-text "Remove the behaviour."` (its ID below is `<id>`).
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | `j drift new "Few" --ref order --happens a --should b --option "Only" --option-text one`, then the same with `--option "A" --option-text a --option "B"` (no text), then with two options titled `A` | Each is refused, naming the problem (from 2 to 5 options; option 2 needs its text; two options titled `A`); no Drift is created | ☐ |
| 2 | `j drift resolve <id> --fix-code` with the input not a terminal (for example `j drift resolve <id> --fix-code < /dev/null`) | Refused: `An option must be chosen …`; the Drift stays open | ☐ |
| 3 | `j drift resolve <id> --fix-code --option 9`, then `--accept-proposal --option 1` and `--dismiss --note x` | The first is refused (an option must be chosen, from 1 to 2); the others are refused (an option or a note only goes with fixing the code); the Drift stays open | ☐ |
| 4 | 🔍 In a real terminal: `j drift resolve <id> --fix-code` | A numbered menu of the options with `(recommended)` on the first and the prompt `Option [1]:`; typing `9` asks again; pressing Enter takes option 1; then `Note (optional, Enter for none):`. Typing a note and Enter resolves the Drift | ☐ |
| 5 | `j drift show <id>` | `## Chosen option` `1. Change it` and the note, if you typed one | ☐ |

### G7. Keep what happens with no Proposal
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | ↻. Board: **Keep this** under **WHAT HAPPENS** on Drift 0001 | The card disappears; the Tasks do not change (still 4 files in `$D/tasks`) | ☐ |
| 2 | `sed -n 1,8p $D/drifts/0001-*.md` | `status: resolved`, `resolution: dismissed`, `task: null` | ☐ |
| 3 | `j drift resolve 2 --dismiss` (Drift 0002 has Proposal 0002 attached) | Refused: the Drift has an attached Proposal; accept it or fix the code | ☐ |

### G8. Keep what happens when the Proposal was rejected
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | ↻. **Reject** Proposal 0002 with feedback `x` | Card leaves To decide | ☐ |
| 2 | On Drift 0002 look at the left **Keep this** | It looks disabled; the line under it says `Proposal 0002 was rejected.` | ☐ |
| 3 | Click it | A warning in the editor: `Proposal 0002 was rejected. It will not change the Model: keep what should happen to have the code fixed.` Nothing changes, no terminal launch, the Drift stays open | ☐ |

### G8b. Keep what happens when the Proposal is stale; rework it
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | ↻. Append a blank line to `$D/model/checkout/payment.md` (makes Proposal 0002 stale), then click the left **Keep this** on Drift 0002 | A warning `Proposal 0002 is stale: the Model changed since it was written.` with a **Rework Proposal** button | ☐ |
| 2 | Click **Rework Proposal** | The terminal prints one line: `Use the trama-design skill, without asking questions. Proposal 0002, attached to Drift 0002, is stale: write a new Proposal that makes the same change on the current Model and Requirements, hand it over, and attach it to the Drift in place of the stale one.` | ☐ |
| 3 | `j drift replace-proposal 2 --proposal <new id>` after a new Proposal exists | Drift 0002 shows the new Proposal; Proposal 0002 is rejected with `Replaced by Proposal <new id>` under `## Feedback` | ☐ |
| 4 | On a Drift whose Proposal is still a Draft, click the left **Keep this** | A warning `… is still being written. Wait until the agent hands it over.` | ☐ |

### G9. Technical Tasks
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | The Board has no **New technical task** button | Technical Tasks are filed by the agent (`trama task new --technical`) | ☐ |

### G10. Stale approval is refused
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | ↻. `echo >> $D/model/checkout/order.md`, then try **Approve** on 0001 (it is disabled; use `j proposal approve 1` to see the CLI refusal) | CLI: `error: Proposal 0001 is stale: the Model changed since it touched checkout/order.md. Write a new Proposal.`, exit 1. In the UI the button is disabled, no scan launched | ☐ |

---

## H. Launching the agent (echo mode, S2)

Each launch sends one command to a terminal named after its work (cwd = the demo folder) and the shell prints the prompt: `Scan` for a scan, `Design` for a design request, the Task's short number (for example `T1`) for **Run**, `All tasks` for **Run all To do**. Il terminale non si mostra da solo: l'area dei terminali non si apre se è chiusa, il terminale visibile resta quello di prima e il focus resta dove era; aprire a mano il terminale dall'elenco dei terminali per leggere la riga.

| # | Action | Expected in the terminal | ✓ |
|---|---|---|---|
| H1 | Board: **Scan System** | `Use the trama-scan skill on the whole System.` | ☐ |
| H2 | Diagram, System level: **Scan** | `Use the trama-scan skill on the whole System.` | ☐ |
| H3 | Diagram, Feature level `checkout`: **Scan** | ``Use the trama-scan skill on the Feature `checkout`.`` | ☐ |
| H4 | Diagram, Machine level `order`: **Scan** | Same as H3 (the current Feature) | ☐ |
| H5 | Board: **Quick request…** | Input box titled `Quick Design Request`, prompt `What should the agent design or change in the Model?`, placeholder `Add a cancelled state to orders…` | ☐ |
| H6 | In H5 press Enter with the box empty | `Describe what to design` | ☐ |
| H7 | In H5 type `Add refunds with $HOME and 'quotes'`, Enter | The printed line is exactly `Use the trama-design skill. Add refunds with $HOME and 'quotes'` (the `$HOME` is **not** expanded, the quotes survive) | ☐ |
| H8 | Click **Quick request…** and press Esc | Nothing is printed | ☐ |
| H9 | Diagram toolbar **Quick request…**, then the Requirements toolbar **Quick request…** | Same input box and result as H5–H7 | ☐ |
| H10 | Board, Task 0001: **Run** | `Use the trama-implement skill on Task 0001.` | ☐ |
| H11 | Board: **Run all To do** | ``Use the trama-implement skill on every Task in the "todo" column. Take them from `trama task next --batch`, one group at a time, until it says there is none.`` | ☐ |
| H12 | Do E11.13 (the two Drifts of E11 and Task 0002 In progress), take Tasks 0005 and 0007 back with `j task take-back 5` and `j task take-back 7`, then look at **Run all To do** and at the **Run this design** button of `Proposal 0003` | **Run all To do** is **disabled** with the tooltip and accessible description `All the Tasks in To do are blocked: Task 0001 is blocked by Drift 0006`; **Run this design** is disabled with `All the Tasks of this design in To do are blocked: Task 0006 is blocked by Drift 0003`. Before taking the Tasks back the tooltips are `An agent is working on Tasks 0005, 0007` and `An agent is working on Task 0007`: the agent working comes first. `j task move 2 todo` enables **Run all To do** | ☐ |
| H13 | Palette: **Trama: Scan System** | A quick pick with placeholder `What should the agent scan?` and two entries: `Whole System` and `Checkout` (description `checkout`) | ☐ |
| H14 | Choose `Checkout`, then repeat and choose `Whole System` | ``…on the Feature `checkout`.`` then `…on the whole System.` | ☐ |
| H15 | Palette: **Trama: Quick Design Request…** | Same input box as H5 | ☐ |
| H16 | After H1 to H15, open the terminal dropdown | Each run of launches with the same name reused one terminal; a launch with another name opened a new terminal and left the previous one open: `Scan` (H1–H4), `Design` (H5–H9), the short number of Task 0001 (H10), `All tasks` (H11), then a new `Scan` (H13–H14) and a new `Design` (H15). No terminal is named `Trama agent`. If an earlier command is still running (for example an agent), the next launch opens a new terminal even with the same name | ☐ |
| H17 | Set `printf '{"trama.agentCommand": "echo"}\n' > /tmp/trama-demo/shop/.vscode/settings.json` (no `{prompt}`), click **Scan System** | The prompt is appended: `Use the trama-scan skill on the whole System.` | ☐ |
| H18 | Set `printf '{}\n' > /tmp/trama-demo/shop/.vscode/settings.json`, click **Scan System** | An input box `Trama: agent command`, placeholder `claude {prompt}    or    codex {prompt}`. With empty text: `Enter the command that starts your agent`. **Press Esc**: nothing is launched. (Typing a command would save it in your *user* settings.) | ☐ |
| H19 | Restore S2. Set `printf '{"trama.agentCommand": "echo {prompt}", "trama.autoScan": false}\n' > /tmp/trama-demo/shop/.vscode/settings.json`, ↻, approve Proposal 0001 | The Proposal is approved (G1.1, G1.4–G1.8 hold) but **no** command is sent to the terminal | ☐ |
| H20 | Restore S2 (settings back to `echo {prompt}`) | | ☐ |
| H21 | Set `printf '{"trama.agentCommand": "echo {prompt}", "trama.autoScan": false, "trama.language": " Italian "}\n' > /tmp/trama-demo/shop/.vscode/settings.json`, ↻, click **Scan System** | One line, ending `Use the trama-scan skill on the whole System. Write everything you generate in Italian, except code, which always stays in English.` (the typed text is trimmed). The same ending appears after **Run all To do**, **Run** on a Task, **Quick request…** (after the request), **Send to agent** on a written design request and **Rework** of a stale Proposal | ☐ |
| H22 | Change `trama.language` to `"   "` (spaces only), ↻, click **Scan System** | The line is exactly `Use the trama-scan skill on the whole System.`, with nothing about language | ☐ |
| H23 | Restore S2 (settings back to `echo {prompt}`, no `trama.language`) | | ☐ |

### H32–H50. Written design requests

Echo mode (S2). In the verification shell, `ls -A $D/requests` lists the requests. A request ID is the local date and time it was created, like `2026-10-04T19-05-12`.

| # | Action | Expected | ✓ |
|---|---|---|---|
| H32 | Board: **Design…** | A new tab `<id>.md`, language Markdown, not in preview (title not italic), completely empty. Its editor title has a **Send to agent** button with the send icon and the tooltip `Send to agent (closing the tab sends it too)` | ☐ |
| H33 | `ls -A $D/requests` and `cat $D/requests/.gitignore` | `.gitignore` and the empty `<id>.md` already exist; the `.gitignore` prints `*`. `git status` in the demo shows nothing under `.trama/requests/` | ☐ |
| H34 | Switch to any other file tab, then back | **Send to agent** is shown only on the request's tab | ☐ |
| H35 | On the empty tab, type only spaces and blank lines, then **Send to agent** | Warning `Trama: write the design request before sending it.`; nothing is printed in the terminal and the tab stays open | ☐ |
| H36 | With `files.autoSave` set to `off`, type five lines: a code fence (three backticks), `# Not a title`, a closing code fence, `# Returns after shipping`, `Customers may send an order back.`; wait a second | The tab never stays marked as unsaved for more than a moment; `cat $D/requests/<id>.md` prints exactly the text typed | ☐ |
| H37 | **Send to agent** | The tab closes without asking to save. The terminal prints ``Use the trama-design skill on the design request in `.trama/requests/<id>.md`. Bind the first Proposal you open to it with `--request <id>`.`` A ghost titled `Returns after shipping` appears in To decide. No other message | ☐ |
| H38 | Reopen `<id>.md` from the Explorer, add a line, wait, then close the tab. Reopen it, delete all its text, wait and close it again | No **Send to agent** button; the line is saved by itself. Closing prints nothing, even when empty, and the file stays | ☐ |
| H39 | Palette: **Trama: Design…**, type `Cancel orders`, wait, close the tab | Closing sends it: the same instruction for the new ID is printed and a ghost `Cancel orders` appears. Reopened from the Explorer, the file has no **Send to agent** | ☐ |
| H40 | **Design…**, then close the empty tab at once | No message, nothing printed; the new file is gone from `$D/requests` | ☐ |
| H41 | Set `printf '{}\n' > /tmp/trama-demo/shop/.vscode/settings.json` (no agent command), ↻. **Design…**, type `Refunds`, **Send to agent**, and press Esc in the `Trama: agent command` box | Nothing is printed; the tab stays open with **Send to agent** | ☐ |
| H42 | Close the tab and press Esc again in the box | The tab is closed and nothing is printed; the file stays. Reopened from the Explorer it has **Send to agent**. Restore S2 | ☐ |
| H43 | Run **Developer: Reload Window** with the H42 request open | Nothing is printed. After the reload the tab is back with **Send to agent**; the H37 request, reopened, still has none | ☐ |
| H44 | **Send to agent** on the H42 request, then reopen it and close it | One instruction is printed for the send, none for the close | ☐ |
| H45 | `j proposal new "Lost" --request 2026-01-01T00-00-00` | `Created Draft Proposal …` followed by `Design request 2026-01-01T00-00-00 was not found; the Proposal is not bound to any request.` The Proposal file has no `request` line | ☐ |
| H46 | Reopen the H37 request. `j proposal new "Returns" --request <id>`; note `<P>`. In `proposal.md`, look at the front matter | `request: <id>` | ☐ |
| H47 | Make `<P>` invalid (`j proposal edit <P> checkout/order.md`, point a Transition at a missing State) and `j proposal submit <P>` | Refused; `$D/requests/<id>.md` still exists and its tab is still open | ☐ |
| H48 | Fix the file and `j proposal submit <P>` again | Output `Submitted Proposal <P> for review` and `Deleted design request <id>: it is now consumed.`; the file is gone and its tab closes. `request: <id>` stays in `proposal.md` | ☐ |
| H49 | Reopen the H39 request (its ID is `<id2>`), `chmod a-w $D/requests/<id2>.md`, add a line (the editor cannot save it), then `rm $D/requests/<id2>.md`. Then **Design…**, type `Gone`, wait and `rm` that file | The first tab stays open, marked as deleted, with the unsaved change, and the file is not written back. The second tab closes; nothing is printed for either | ☐ |
| H50 | With the Trama panel closed, repeat the second half of H49 | The tab still closes | ☐ |

### H51–H70. External terminal

Gli scenari del launcher `external-terminal` su Linux o macOS non sono ancora stati eseguiti: annotare ciò che si osserva anche quando coincide con l'atteso. Configurare `printf '{"trama.agentLauncher": "external-terminal", "trama.agentCommand": "echo {prompt}", "trama.autoScan": false}\n' > /tmp/trama-demo/shop/.vscode/settings.json` (**S2x**) e ricaricare la finestra. Per un agente lento usare `"trama.agentCommand": "sleep 30; echo {prompt}"` (**S2y**). `trama.externalTerminalCommand` vale soltanto nelle impostazioni **utente**: il valore in `.vscode/settings.json` della demo viene ignorato. I marcatori di fine sono nella cartella `external-terminals/` dell'archiviazione globale dell'estensione (`find ~/.config/Code/User/globalStorage -name external-terminals`, o l'equivalente dell'editor in uso); chiamarla `$M`.

| # | Action | Expected | ✓ |
|---|---|---|---|
| H51 | Set S2x, reload, Board: **Scan System** | A window of the system terminal opens outside the editor, in `/tmp/trama-demo/shop`, titled `Scan` when the terminal allows it. It prints `Use the trama-scan skill on the whole System.` and stays open at the prompt of your login shell. The editor's terminal panel gets **no** `Scan` terminal | ☐ |
| H52 | In that window run `echo $TRAMA_AGENT $TRAMA_TERMINAL` and `trama proposal approve 1` | `1` and six lowercase letters and digits; the approval is refused as the developer's decision. With a packaged extension (which has the `trama` binary inside), `echo $PATH` starts with the folder of that binary | ☐ |
| H53 | `ls -A $M` right after H51 | Empty: the marker the script left was read and deleted. No file holds the instruction | ☐ |
| H54 | Set S2y, reload, Board: **Quick request…**, type `Add refunds after pickup`, Enter | A new window opens, titled `Design` when the terminal allows it. Within about a second the Board shows the `Proposal` ghost `Add refunds after pickup`, `Preparing`; `sed -n 's/^terminal: //p' $D/announcements/*.md` prints the same six characters as `echo $TRAMA_TERMINAL` in the window | ☐ |
| H55 | Wait for the command to end (30 seconds) | The ghost disappears and the notice `The agent finished without delivering Proposal Add refunds after pickup.` appears at the top of the Board. The window stays open with a shell and `ls -A $M` is empty | ☐ |
| H56 | With S2y click **Scan System**, then run `TRAMA_AGENT=1 j task move 1 doing` in the verification shell and wait for the command to end | Task 0001 shows the agent dot while the command runs and goes back to To do, with no Take back, when it ends | ☐ |
| H57 | Con S2y premere **Scan System** due volte, la seconda mentre il primo comando lavora; non inviare altre istruzioni | Due finestre. Ogni fine rilascia i Task e ritira gli annunci della propria finestra, anche per la finestra sostituita; entrambi i marcatori sono eliminati. Gli annunci non consegnati producono i consueti avvisi locali sulla Board | ☐ |
| H58 | Con S2x sostituire `echo {prompt}` con `sh -c 'exit 3' {prompt}`, ricaricare e premere **Scan System** | La finestra non mostra output dell'agente e resta aperta nella shell; `ls -A $M` è vuoto perché il marcatore di fine è stato elaborato | ☐ |
| H59 | S2y, click **Scan System**, close the window by hand while the command runs, wait 40 seconds | Nothing happens in the editor: no end, no notice. Task 0001 taken with `TRAMA_AGENT=1 j task move 1 doing` before the click stays taken (agent dot); a ghost announced from the window stays until the fifteen minutes of quiet | ☐ |
| H60 | S2y, click **Scan System**, then Developer: Reload Window while the command runs and wait 40 seconds | No notice for that end: its marker was deleted at startup or, if it came while the window was closed, when the extension started. `ls -A $M` is empty | ☐ |
| H63 | Add `"trama.externalTerminalCommand": "/nonexistent/terminal {command}"` to the **user** settings, click **Scan System** | No window. Error `Trama could not open an external terminal: <reason>. The instruction was copied to the clipboard.` with no buttons, `<reason>` being `the terminal could not be started` or the system's error message. Pasting gives `Use the trama-scan skill on the whole System.`. No terminal opens in the editor either, and no ghost or Task changes | ☐ |
| H64 | With H63 still set, **Quick request…** `Never sent` | The same error; no ghost appears; **Design…** then **Send to agent** with some text fails the same way and the request is not marked as sent: it stays in `$D/requests` and **Send to agent** works again later | ☐ |
| H65 | Put `"trama.externalTerminalCommand": "xterm -e {command}"` in the **workspace** settings (`.vscode/settings.json`) and remove it from the user settings, click **Scan System** | The workspace value is ignored: the detected terminal opens, not `xterm`. Put it in the user settings instead: a new `xterm` window runs the command and stays open. Remove it again | ☐ |
| H66 | With `$TERMINAL` unset on Linux, `xdg-terminal-exec` and `x-terminal-emulator` absent and none of the listed terminals on the `PATH` (for example start the editor with `PATH=/usr/bin/nonexistent`), click **Scan System** | Error `Trama could not open an external terminal: no terminal was found; set trama.externalTerminalCommand. The instruction was copied to the clipboard.` | ☐ |
| H67 | 🔍 Open the demo through Remote - SSH, WSL or a container, click **Scan System** | Error `Trama could not open an external terminal: external terminals are not available in a remote workspace. The instruction was copied to the clipboard.` | ☐ |
| H68 | 🔍 With kitty detected (`TERMINAL=kitty`), click **Scan System** with S2x, wait for the end, click it again, then wait and click **Quick request…** `Named apart` | The first click opens a kitty window titled `Scan`, started with remote control on its own socket. The second writes the instruction into **the same window**, which shows both runs one after the other and a second prompt; no new window opens. `echo $TRAMA_TERMINAL` there still prints the same six characters, and `$M` holds no marker once each run ended. The design request has another name: a new window titled `Design` opens without a warning and the `Scan` window stays open | ☐ |
| H69 | 🔍 With the `Design` window of H68 free, close it by hand and click **Quick request…** `Closed by hand` | A new kitty window opens and the warning `Trama could not reuse the external terminal window: <reason>. A new window was opened.` appears with no buttons. If the kitty process itself is gone the reason is the scripting's error; if only the window was closed, kitty's `send-text` reports no error, so look at what you get and write it in the defect log | ☐ |
| H70 | 🔍 Repeat H68 with WezTerm (`TERMINAL=wezterm`) and, on macOS, with Terminal.app; then with any other terminal (for example `TERMINAL=xterm`) and with `trama.externalTerminalCommand` set | WezTerm and Terminal.app reuse the free window as kitty does, only for the same name; the Terminal.app window is titled `Scan`, then `Design`. With any other terminal, or with the command set, every click opens a new window and no warning appears | ☐ |

Dopo H55 e H57 ripristinare S2 (`echo {prompt}`, senza launcher); al termine degli scenari del terminale esterno rimuovere l'eventuale valore di prova di `trama.externalTerminalCommand` dalle impostazioni utente.

### H71–H77. Agent terminal as an editor tab

Written from the Requirements for the `terminal-tab` launcher; the rows have not been run yet, so note what you see even when it matches. A settings file with the launcher: `printf '{"trama.agentLauncher": "terminal-tab", "trama.agentCommand": "echo {prompt}", "trama.autoScan": false}\n' > /tmp/trama-demo/shop/.vscode/settings.json` (**S2t**), then reload the window. A slow agent: the same with `"trama.agentCommand": "sleep 30; echo {prompt}"` (**S2u**). Open the Trama panel alone in one editor group before each row.

| # | Action | Expected | ✓ |
|---|---|---|---|
| H71 | Set S2t, reload, click in the panel's search box (or any editor), then Board: **Scan System** | A tab titled `Scan` opens in a new editor group beside the panel's and prints `Use the trama-scan skill on the whole System.`; it does **not** take the focus: the keyboard stays where it was. The panel stays visible; the terminal area gets **no** `Scan` terminal. `echo $TRAMA_AGENT` in the tab prints `1` | ☐ |
| H72 | Click on the panel, then **Scan System** again (the first command has ended) | No new tab: the same tab comes to the front of its group, without taking the focus, and prints the line a second time | ☐ |
| H73 | Impostare S2u, ricaricare, premere **Scan System** e ripeterlo mentre il primo comando lavora | Una seconda scheda `Scan` si apre nello **stesso** gruppo della prima, non in un terzo gruppo; la prima resta aperta. Ogni fine viene seguita come nel terminale integrato: i Task presi tornano a To do come in H56 e gli annunci non consegnati vengono ritirati con avvisi locali. Quando entrambi terminano, **Run all To do** apre una scheda `All tasks` nello stesso gruppo; le schede `Scan` restano aperte | ☐ |
| H74 | With S2u, close every agent tab and the group of H73, click **Scan System**, then close the group of the new tab while it runs and click **Scan System** again | Each time a new group opens beside the active one, since the previous tab's group is gone | ☐ |
| H75 | With S2u, **Quick request…** `Tabbed request`, then close the tab while the command runs | The `Tabbed request` ghost appears at once and is withdrawn when the tab closes, as when the integrated terminal closes; the next **Scan System** opens a new tab beside the active group | ☐ |
| H76 | Drag the `Scan` tab of H71 into another group, then click **Scan System** twice with S2u | The second new tab opens in the group where Trama had opened the first one, not where you dragged it: Trama does not follow a moved tab | ☐ |
| H77 | Remove `trama.agentLauncher` from the settings (`auto`), reload, close the terminal area, click in the panel's search box, then **Scan System** in VS Code; then open the demo in Cursor and click it with `"trama.agentLauncher": "auto"` | VS Code: the `Scan` terminal is created in the terminal area, never as a tab, but is not shown: the terminal area stays closed, the keyboard stays in the search box, and `Scan` is in the list of terminals. Cursor: the instruction goes to the chat, never to a tab | ☐ |

After H71–H77, restore S2.

---

## I. Real agent: omp 🪙

Switch modes with the script, from the repo (it works from any shell, fish included, and keeps the other keys of `settings.json`): `cd /home/luca/Developer/Trama && bun run scripts/demo-agent.ts <echo|path|omp>`. Stop an agent at any time with Ctrl+C. Quit omp between launches (I7).

| # | Action | Expected | ✓ |
|---|---|---|---|
| I0 | No omp, no tokens. Run `bun run scripts/demo-agent.ts path`, then ↻ and Board: **Scan System** | The terminal shows, on two lines, `/home/luca/Developer/Trama/dist/trama` and `Use the trama-scan skill on the whole System.`. This checks the PATH prefix and the quoting in your own shell. Verified by script in fish | ☐ |
| I1 | `bun run scripts/demo-agent.ts omp`, ↻, then Board: **Scan System** | The terminal shows `PATH=/home/luca/Developer/Trama/dist:$PATH omp 'Use the trama-scan skill on the whole System.'` and omp starts and starts working on the prompt. Reproduced by script in a real terminal in fish (banner, then `Working…`). If it fails for you, copy the exact text the terminal shows | ☐ |
| I2 | In omp type `/skill:trama-scan` (or ask which skills are loaded) | The skill `trama-scan` is known. If not, omp does not read `.agents/skills/` of the project: report it | ☐ |
| I3 | Interrupt omp and ask it to run `command -v trama` | `/home/luca/Developer/Trama/dist/trama` | ☐ |
| I4 | Ask it to run `trama board` | The same board as S5 | ☐ |
| I5 | Let the scan finish. In the verification shell: `j board` | Tasks 0005 to 0008 were created (about four, one per Machine or group of States; the demo has no code, so everything not covered by Tasks 0001 to 0004 is missing) and **no Drift**. **Proposals 0001 and 0002 are still open**: the agent must not have run `proposal approve`, `proposal reject` or `drift resolve`. `j validate` is still valid and `.trama/model/` is unchanged. Ran against a real omp: passed | ☐ |
| I6 | While the scan runs watch the board | The new Tasks appear in To do by themselves while the agent works (seen: 2 to 5 cards after about 27 s, 6 after 33 s). Ran against a real omp: passed | ☐ |
| I7 | While omp is still running in the terminal, click **Scan System** again | A **new** terminal named `Scan` opens and runs the command there; the running omp receives nothing. (Before this was fixed the command line was typed into omp as a message.) Once every command has finished, the next launch with the same name reuses the last terminal instead of opening another. Reproduced the old bug twice and verified the fix with a slow command; not yet repeated with omp itself | ☐ |
| I8 | Quit omp. **Quick request…** with `Orders can also be returned` | omp reads the `trama-design` skill and explores the Model. Because Proposal 0001 already covers part of this, it asks you with a menu (options such as replacing or extending 0001) and **waits for your answer**. Pick an option; omp then writes a Proposal that appears in To decide as soon as the file exists, with its changes listed. Ran against a real omp as far as the question; the answer and the new Proposal still need a human | ☐ |
| I9 | ↻ (Task 0002 must be in To do: **Run** only exists on To do cards). Quit omp, then Board: **Run** on Task 0002 | The terminal shows `… omp 'Use the trama-implement skill on Task 0002.'`. omp reads the Task (`trama task show 0002`) and moves it to In progress. The demo has no code and no stack, so it asks you what to build with and, if you do not answer, puts the Task back in To do. Nothing is written in `.trama/model/`. Ran against a real omp: passed up to that point | ☐ |

---

## J. Empty project

Setup: `mkdir -p /tmp/trama-empty && code --extensionDevelopmentPath=/home/luca/Developer/Trama/extension --new-window /tmp/trama-empty`

| # | Action | Expected | ✓ |
|---|---|---|---|
| J1 | **Trama: Open** | An information message `This workspace has no Trama project yet.` with a button **Initialize Project** | ☐ |
| J2 | Dismiss the message | No panel opens | ☐ |
| J3 | Run it again, click **Initialize Project** | `.trama/model/system.md` and `.agents/skills/trama-{design,scan,implement}/SKILL.md` appear; the panel opens | ☐ |
| J4 | Look at the Diagram 🔍 | Breadcrumb `System`. The code has the hint `The Model is empty. Use Design… to have an agent describe the System.` but it was not seen with a project that only has `system.md`: note what is shown. Board shows 0 in all columns and no badge | ☐ |
| J5 | `cat /tmp/trama-empty/.trama/model/system.md` | `# Trama empty` heading and `Describe what this System is and who it is for.` | ☐ |
| J6 | Remove `.trama` (`rm -r /tmp/trama-empty/.trama`), put the text `custom` into `.agents/skills/trama-scan/SKILL.md`, run **Trama: Initialize Project** | A **modal** warning `Trama did not initialize this project.` whose detail lists `…/trama-scan/SKILL.md`, with one button **Overwrite Skills and Initialize** | ☐ |
| J7 | Press Esc/Cancel | Nothing is created; `custom` is still in the file | ☐ |
| J8 | Repeat J6 and click the button | `.trama/` is created and the skill file is overwritten | ☐ |
| J9 | In the demo window run **Trama: Initialize Project** (it already has `.trama/`) | Error `Trama: …/.trama already exists` | ☐ |
| J10 | `mkdir -p /tmp/trama-empty2/.vscode && printf '{"trama.skillsDir": ".claude/skills"}\n' > /tmp/trama-empty2/.vscode/settings.json`, open that folder in a new window with the extension, **Trama: Open** → **Initialize Project** | Skills land in `.claude/skills/trama-*/SKILL.md` and `.agents/` is not created | ☐ |

---

## K. Appearance and accessibility

| # | Action | Expected | ✓ |
|---|---|---|---|
| K1 | Switch to a light theme (Ctrl+K Ctrl+T) and look at the Board and each Diagram level | Text, edges, badges and ghost colours stay readable; no white text on white | ☐ |
| K2 | Switch back to a dark theme | Same | ☐ |
| K3 | Narrow the editor group to about 700 px | Board scrolls horizontally (columns keep a minimum width); the Diagram canvas is not hidden by the panel | ☐ |
| K4 | Use only the keyboard on the Board (Tab, Shift+Tab, Enter) | Every button is reachable and shows a visible focus ring | ☐ |
| K5 | Hover disabled buttons | Disabled **Approve** shows its reason; so does a disabled **Run all To do** or **Run this design** | ☐ |

---

## Q. Markdown in the panel

| # | Action | Expected | ✓ |
|---|---|---|---|
| Q1 | Diagram, System level, select the System. In `.trama/model/system.md` write a description with `**bold**`, a list and a `code` span | The panel shows bold text, a list and monospace code, not the marks. A heading line (`## Title`) shows bold at the text size, never bigger than the panel's own headings | ☐ |
| Q2 | Select a State whose Transition note has `*italic*` | The note in the list entry shows italic inline; a `- item` line in a note stays as written (only inline formatting there) | ☐ |
| Q3 | Open a Proposal whose body has a list and a fenced block | The Proposal card shows the list and a code block; a long line scrolls inside the block, not the panel | ☐ |
| Q4 | Requirements tab, an Area whose section holds a bulleted list | The list shows as a list; a changed section shows the old text struck through, also as Markdown | ☐ |
| Q5 | Write `<img src=x onerror=alert(1)>`, `![pic](https://example.com/a.png)`, a `| a | b |` table, `[x](javascript:alert(1))` and `[rel](docs/x.md)` in a Requirement section | The first three show as written text; no image loads and no alert fires; the table keeps its lines; the last two show only their label, as plain text without a link | ☐ |
| Q6 | Write `2 * 3 * 4` and an unclosed `**bold` | Both show as written | ☐ |
| Q7 | Nelle descrizioni di Diagramma, Board e Requisiti e nei testi dell'overlay domande, scrivere `[Manuale](https://example.com "Capitolo ) finale")` e `<span title="**testo**">valore</span>` | Compare solo il link `Manuale`, senza residui del titolo; il tooltip mostra l'indirizzo e il clic passa all'editor senza navigare il pannello. Il frammento HTML resta testo letterale, compresi gli asterischi dell'attributo, senza elementi HTML né grassetto aggiunti | ☐ |

---

## M. Requirements

| # | Action | Expected | ✓ |
|---|---|---|---|
| M1 | Click the **Requirements** tab | Two Areas, **Data** (`requirements/data`) and **Interface** (`requirements/ui`), each with its italic "Use when…" line and **Open file**, then one fragment group **main.md** (title, file name in grey, its italic description, a small **Open file** link) holding the sections, General first. The Proposal selector is disabled (no open Proposal touches Requirements) | ☐ |
| M2 | Click the section title **order/Paid** | The Diagram opens on `order` with Paid selected; the panel ends with **Requirements → Interface** and the two Paid lines | ☐ |
| M3 | In the panel, click **Interface** | The Requirements tab shows only `order/Paid`, with "Showing requirements/ui#order/Paid" and **Show all** | ☐ |
| M4 | Verification shell: `j state order/Preparing` | Ends with `## Requirements`: `requirements/ui#order/Paid (via order/Paid)`, `requirements/data#order (via order)`, `requirements/ui#checkout (via checkout)` | ☐ |
| M5 | `ls /tmp/trama-demo/shop/.agents/skills` after `j skills update` | `trama-req-data-main` and `trama-req-ui-main` next to the Trama skills; `trama-req-ui-main/SKILL.md` has `description: Use when building or changing screens…`. The output has the line `Requirement skills: one skill per fragment (budget <n>/4000 characters).` | ☐ |
| M5b | `mkdir /tmp/trama-demo/shop/.agents/skills/trama-fix` with a file inside, and the same under `.claude/skills`, then `j skills update` | The output has a line `Deleted the retired trama-fix skill:` naming both folders; neither exists any more. Running it again prints no `Deleted` line. In the editor, **Trama: Update Agent Skills** shows the same line in its notification | ☐ |
| M6 | Edit `.trama/requirements/ui/main.md` by hand: change "Mobile first" to "Mobile first, always" and save | Within a second `.agents/skills/trama-req-ui-main/SKILL.md` says "Mobile first, always". The Requirements tab shows the new text | ☐ |
| M7 | Append `## order/Lost` and a line to `ui/main.md`, save | The yellow bar: "The Model or its Requirements have 1 validation error"; the link `requirements/ui/main.md:<line>` opens the fragment. Remove the section again: the bar disappears | ☐ |
| M8 | `j proposal new "Blue badge"`, then `j proposal edit <id> requirements/ui/main.md`, change "green" to "blue" in the printed file and `j proposal submit <id>` | On the Board the submitted card lists `requirements/ui/main.md ~1` and has **View requirements**, not **View on diagram**. `j proposal show <id>` labels the file with Area `ui` and fragment `main` | ☐ |
| M9 | Click **View requirements** | Requirements tab with the Proposal selected: `order/Paid` has a **changed** badge, the old text struck through above the new one | ☐ |
| M10 | `j proposal edit <id> checkout/order.md`, delete the `### Paid` State and its sub-States in the printed file, then `j validate --proposal <id>` and `j proposal submit <id>` | The edit withdraws it into Draft. Both commands fail with the missing State and Requirement errors; it is absent from the selectors and decision count | ☐ |
| M11 | `j proposal discard <id>` | The Draft is discarded; `ui/main.md` and the skill unchanged | ☐ |
| M12 | `j proposal new "Order screens"`; `j proposal edit <id> requirements/ui/main.md` and remove the `## order/Paid` section; `j proposal edit <id> requirements/ui/orders.md` and write a front matter `description: Use when building the order screens.`, `# Order screens` and the `## order/Paid` section with "green" changed to "blue"; `j proposal submit <id>`; select it in the Requirements tab | Interface shows **main.md** without order/Paid, then **Order screens** `orders.md` with the badge **new fragment**; inside it `order/Paid` carries **moved from main** and **changed**, the old text struck through above the new one. `order/Paid` appears nowhere else | ☐ |
| M13 | `j proposal edit <id> requirements/ui.md`, then `j proposal edit <id> requirements/ui/x/y.md` | Both are refused, saying Areas are folders and an Area has no subfolders | ☐ |
| M14 | Reject the Proposal of M12. Append 1,300 lines `- A rule.` to `ui/main.md`, then `j validate` and `j analyze` | `validate` says the Model and its Requirements are valid, exits `0`, then `1 warning(s)…` naming `requirements/ui/main.md` with its size over 12288 (12 KB). `analyze` lists `[large-fragment] requirements/ui/main.md: …`. Undo the lines | ☐ |
| M15 | Make the description of `ui/main.md` longer than 4,000 characters and run `j skills update` | `Requirement skills: one index skill per Area (budget <n>/4000 characters).` and `Switched from one skill per fragment to one index skill per Area.`; `.agents/skills` holds `trama-req-data` and `trama-req-ui` (with `SKILL.md` and `main.md`) and no `trama-req-*-main`. `j requirements ui` ends its header with ``Load: skill `trama-req-ui` ``. Restore the description and run it again: the fragment skills come back with `Switched from one index skill per Area to one skill per fragment.` | ☐ |
| M16 | Migration: in the verification shell `rm -r $D/requirements/data && printf -- '---\ndescription: "Data."\n---\n# Data\n\nAll amounts.\n\n## order\nCents.\n' > $D/requirements/data.md`, then `j validate` | One error on `requirements/data.md` telling to run `trama skills update` | ☐ |
| M17 | `j skills update`, then `ls $D/requirements/data` and `cat` both files | The output says `Converted 1 single-file Requirement Area(s) … : data`. `area.md` holds the description, `# Data` and `All amounts.`; `main.md` the same description and title with `## order` and `Cents.`; `requirements/data.md` is gone and `j validate` is clean. A Task referencing `requirements/data#order` still shows its text. Recreate a `requirements/data.md` next to the folder and run it again: `Left 1 single-file Requirement Area(s) as they were: data (requirements/data/ already exists)` | ☐ |

---

## N. Dependent Proposals and import

| # | Action | Expected | ✓ |
|---|---|---|---|
| N1 | Verification shell: `j proposal new "Bank" --import`, `j proposal edit <A> actors/bank.md`, write an Actor `# Bank` with an Event `TRANSFER_RECEIVED`, then `j proposal submit <A>` | Board: handed-over card for A with an **import** badge | ☐ |
| N2 | `j proposal new "Billing" --import --requires <A>`, then `j proposal edit <B> billing/feature.md` (write `# Billing`) and `j proposal edit <B> billing/invoice.md` (a Machine with `### Open (initial)` → `` - `bank.TRANSFER_RECEIVED` → Paid `` and `### Paid (final)`), then `j proposal submit <B>` | Submission succeeds despite A not being approved. Card B has **import** and **requires A** badges; **Approve** is disabled until A is approved | ☐ |
| N3 | Diagram: pick Proposal B in the selector | The **Bank** Actor is drawn as normal (not as a ghost), **Billing** and **Invoice** as added; the panel says "Drawn on top of Proposal A, not yet approved" | ☐ |
| N4 | Approve A, then B, from the Board | Both approved; no agent is launched (import Proposals start no Scan); `j validate` is valid | ☐ |
| N5 | Repeat N1 and N2, then reject A | Card B stays, with **requires A** in red and Approve disabled: "Proposal A "Bank" was rejected" | ☐ |
| N6 | **Trama: Import from Code** on a repository with code (agent configured) | The agent receives `Use the trama-import skill on this repository.`, asks one round of questions (folders, Feature split) with a recommended option each, then writes Proposals: one for the System and Actors, one per Feature requiring it, each ending with `## Doubts` | ☐ |

---

## O. Draft hand-over

| # | Action | Expected | ✓ |
|---|---|---|---|
| O1 | Board tab after reset | Nothing for Inventory checks: no card, no band, no Discard button | ☐ |
| O2 | Inspect Diagram and Requirements selectors and Board badge | No Draft in either selector or the decision count | ☐ |
| O3 | `j board` | Inventory checks is listed under **In writing** marked `(draft)`, apart from To decide | ☐ |
| O4 | Attempt to keep what happens on the Inventory Drift, whose attached Proposal is still a Draft | The left **Keep this** looks disabled with the still-being-written reason and the click shows the editor warning; a direct host or CLI attempt is refused too | ☐ |
| O5 | Submit the Draft with `j proposal submit 4` | It appears in To decide and the Diagram selector; the badge increases by one | ☐ |
| O6 | `j proposal edit 4 checkout/order.md`, without changing its contents | Notice says returned to Draft; overlay and decision card disappear and nothing replaces them on the Board | ☐ |
| O7 | `j proposal discard 4` | It is marked discarded, with no confirmation and no feedback asked | ☐ |

---

## P. Agent question rounds

Use the [question request contract](./cli.md#question-rounds) with `trama ask --root /tmp/trama-demo/shop < round.json`. Include single-choice and multiple-choice questions, with different recommendations, a `context` and an option with `details`. Run P1–P6e in VS Code and again in Cursor.

| # | Action | Expected | ✓ |
|---|---|---|---|
| P1 | With the Trama panel closed, or behind another editor tab, submit a valid round, then switch focus away and back | The panel comes to the front by itself (or opens) with the overlay over the current tab and a dimmed background; no notification has to be clicked. The header reads `Questions from the agent`, the agent's name and `Question 1 of <total>`, with **Minimize** and **Close**; focus loss leaves it open. The question, its context and the option descriptions are rendered as Markdown and unchanged | ☐ |
| P2 | Submit a round whose later question has an out-of-range recommendation | Identified `invalid-input` error; no earlier question is presented | ☐ |
| P3 | Choose a non-recommended option, press **Next**, then **Back** | On the first visit the recommended option was chosen; after Back the earlier choice is still there rather than the recommendation. **Back** is absent on the first question. Choosing again and **Next** replaces the answer | ☐ |
| P4 | On a multiple-choice question press **1** and **3**, then click in **Your answer (optional)**, type a few lines and press **2** | Keys 1 and 3 tick those options; typing `2` in the text area writes the digit instead of choosing. The area grows with the text up to ten rows. On a single-choice question clicking the chosen option clears it, and **Next** is disabled with the tooltip `Choose an option or write an answer first` until there is a choice or a text | ☐ |
| P5 | Press **Esc** on a question, on the summary and on the Skip all confirmation; press **Tab** repeatedly | Esc does nothing anywhere. Tab cycles inside the overlay (inside the confirmation while it is open) and never reaches the panel behind | ☐ |
| P5b | Click questions in the index, then open an option's **Show details**, go to another question and back | The index highlights the current question and shows `Answered`, `Skipped` or `Missing` with an icon; its text is shortened, the full text in the tooltip. Details were closed again on the second visit | ☐ |
| P6 | Answer the first question, **Skip** the second, then **Skip all**; first press **Go back** in the confirmation, then repeat and confirm | The confirmation reads `Skip all unanswered questions?` and `The agent will use its recommendation for each of them.`, with focus on **Go back**; Go back returns to the same question with nothing changed. Confirming returns the result at once: the first answer, and `skipped` for every other question | ☐ |
| P6b | Answer every question but the last, open **Summary**, then **Edit** an answer and press **Next** | The summary lists each question with its answer (labels, the written text with its line breaks, `Skipped`, or `Missing` in the warning colour with an icon). **Send to agent** is disabled under `Answer or skip 1 more question(s) to send.`. After Edit, Next (labelled **Review**) returns to the summary. Answering the last question enables **Send to agent**, which returns the answers and closes the overlay | ☐ |
| P6c | Start a round, press **Minimize**, then **Open questions** in the bar | A bar at the top of the panel reads `The agent is waiting for your answers (question <n> of <total>)`; the tabs behind are usable. Open questions brings back the same question with what was typed | ☐ |
| P6d | With a round open, close the Trama panel, then press **Reopen** | The notice `Trama has questions from the agent waiting.` appears; Reopen opens the panel on the same question. Pressing **Close** (×) in the overlay asks the Skip all confirmation instead of closing | ☐ |
| P6e | Narrow the panel below 600 px | The index becomes a row of numbered dots coloured by state, ending with `Σ` for the summary; each dot's tooltip names its state and question | ☐ |
| P7 | Start two rounds in one window; cancel the queued caller, then cancel the active caller with another round queued | Cancelling the queued caller leaves the active overlay as it is. Cancelling the active caller closes it and opens the next FIFO round, with no orphan overlay | ☐ |
| P8 | Leave a multi-question round with text typed after one confirmed answer; queue two more `trama ask` rounds; remove or rename `.trama/` in the fixture | All three return `editor-interrupted`, no answers, and the overlay disappears; queued questions never appear | ☐ |
| P9 | Close the editor with one `trama ask` round active and another queued | Both return `editor-interrupted`; a later new request without an editor returns `unavailable`, not an interruption or skipped answers | ☐ |
| P10 | Keep a round pending in one window while completing one in another; change focus between same-project windows | Windows remain independent. Discovery chooses the most recently focused live window; an endpoint supplied by a Trama-launched terminal takes precedence | ☐ |
| P11 | Read the three shipped interview skills and exercise an explicit skip, initial absence and admitted-round interruption | Skips are reported as assumptions, initial absence alone permits agent-specific fallback, and interruption stops the workflow without retry or creating work from unanswered decisions | ☐ |

---

## R. Cursor

Run R1–R4 on **every new Cursor version** before declaring it supported (smoke test). Tested: 3.22.12 and 3.23.12. Open the demo with the packaged extension in Cursor's editor window (not the Agents Window), with no `trama.agentLauncher` in any settings, and run **Trama: Update Agent Skills** once.

| # | Action | Expected | ✓ |
|---|---|---|---|
| R1 | `cat ~/.cursor/hooks.json` | `version: 1` and, under each of `beforeSubmitPrompt`, `stop` and `sessionEnd`, one entry `"<extension folder>/bin/trama" cursor-hook`; entries you had before are still there | ☐ |
| R2 | Board: **Quick request…** with `Orders can also be returned` | A **new** chat opens and sends `Use the trama-design skill. Orders can also be returned` by itself, with a second line `The trama command may not be on your PATH. Before anything else run: export PATH="…/bin:$PATH"`. No «Create chat with prompt» confirmation and no clipboard notice | ☐ |
| R3 | Let the agent ask its questions | `trama ask` brings the Trama panel forward in this window with the overlay of P1, the agent named `Cursor`. If the agent first gets `unavailable` inside Cursor's sandbox, it retries once outside it after asking permission; it keeps waiting when Cursor moves the command to the background | ☐ |
| R4 | In the chat's terminal output, check that `trama proposal approve 1` run by the agent would be refused | The agent reports `"trama proposal approve" is the developer's decision … (CURSOR_AGENT is set)` | ☐ |
| R5 | Interrupt the agent (Stop) while a ghost it announced is on the Board | The ghost disappears and the notice `The agent finished without delivering …` appears. Closing the chat instead removes such a ghost without a notice | ☐ |
| R5b | Have the agent run `trama task move 1 doing`, then let its turn end | Task 0001 goes back to To do, no longer marked `(agent working)` | ☐ |
| R7 | Approve a Proposal with `trama.autoScan` on | A new chat starts the scan by itself, with no «Create chat with prompt» confirmation and no **Scan now** notice. Only if Cursor could only fall back, the notice `Trama: Proposal <id> was approved. Scan the Features it affects?` with **Scan now** appears instead, and nothing was put on the clipboard | ☐ |
| R8 | Set `"trama.agentLauncher": "terminal"` and `"trama.agentCommand": "agent {prompt}"`, click **Scan System** | Cursor's CLI starts in the **Scan** terminal, as any terminal agent | ☐ |

## U. Short numbers

Start each block with ↻. `$D` and `j` are the ones of S4.

| # | Action | Expected | ✓ |
|---|---|---|---|
| U1 | `j task list` | `To do`: `T1 Implement refunds for prepared orders`, `T2 Payment declined email`; `In progress`: `T3 Cart confirmation`; `Done`: `0004 Upgrade dependencies`. Each card shows its number or its identity, never both | ☐ |
| U2 | `j --json task list` | Every Task has `id` (the permanent identity, `"0001"` …) and `number` (`"T1"`, `"T2"`, `"T3"`); Task `0004` has an `id` and no number. The same holds for `j --json proposal list --all` (`P1`, `P2`) and `j --json drift list --all` (`D1`, `D2`) | ☐ |
| U3 | `cat $D/short-numbers/assigned` and `cat $D/short-numbers/.gitignore` | One line per live card, `<kind> <identity> <number>`: `proposal 0001 1`, `proposal 0002 2`, `drift 0001 1`, `drift 0002 2`, `task 0001 1`, `task 0002 2`, `task 0003 3` (in any order), and no line for Task `0004`. The `.gitignore` holds only `*`. No number appears in any file under `$D/tasks`, `$D/drifts` or `$D/proposals` (`grep -rn 'T1\|D1\|P1' $D/tasks $D/drifts $D/proposals` finds no card number) | ☐ |
| U4 | `j task show T1`, then `j task show t1`, then `j task show 0001` | The same Task three times. The heading names it by its number `T1` | ☐ |
| U5 | `j task move T1 doing`, then `ls $D/tasks` and `sed -n 1,8p $D/tasks/0001-*.md` | Task `0001` moved to In progress; the file kept its name and holds no `T1` | ☐ |
| U6 | `j proposal show T1`, `j drift show T1`, `j task show P1` | Each is refused, changes nothing and says why: `T1` is a Task, not a Proposal or a Drift; `P1` is a Proposal, not a Task | ☐ |
| U7 | `j task show T99`, `j task move T99 done`, `j proposal show P99` | Each is refused, changes nothing and says that no live card of that kind has that number | ☐ |
| U8 | `j task show 0004` | Task `0004` is found by its identity, although it is Done and has no number | ☐ |
| U9 | `j task move T2 done`, then `j task list` and `cat $D/short-numbers/assigned` | Task `0002` is listed in Done by its identity and has lost its line; `T1` and `T3` keep their numbers | ☐ |
| U10 | `j task new "Extra" --technical --ref requirements/ui#General` | The new Task takes the lowest free number, `T2`, which Task `0002` released. `j task list` shows it as `T2` in To do | ☐ |
| U11 | `j task move 0004 todo` | Task `0004` leaves Done and takes the lowest free number, `T4` | ☐ |
| U12 | `j proposal reject P1 --feedback x` (with `TRAMA_AGENT` and `CURSOR_AGENT` unset) | Proposal `0001` is rejected. `j proposal list --all` shows it by its identity `0001`, with no number, and Proposal `P2` keeps its number. `j drift resolve D1 --dismiss` behaves the same way for the Drift | ☐ |
| U13 | Follow G8b to the end (rework of the stale Proposal of Drift `D2`, naming the new Proposal by its short number), then `grep -rn 'Replaced by' $D/proposals` | The rejected Proposal's feedback reads `Replaced by Proposal <identity>` with the permanent identity, never a `P…` number | ☐ |
| U14 | ↻, then `rm $D/short-numbers/assigned` and `j task list` | No error. The live cards get their numbers again in creation order (`T1`, `T2`, `T3`, as in U1) and `assigned` exists again | ☐ |
| U15 | Write a line twice: add `task 0003 1` to `assigned` with `echo 'task 0003 1' >> $D/short-numbers/assigned`, then `j task list` | No error and no duplicate number among the Tasks; the numbers were rebuilt from zero in creation order | ☐ |
| U16 | Board: read the badge of `0001` in To do and of `0004` in Done | The live Task shows `T…` and the Done Task shows its eight-character or four-digit identity, in the same place, in the same monospaced font; never both on one card | ☐ |
| U17 | Hover each, and read the accessible name (DevTools, Accessibility) | Tooltip and name are `Short number (temporary)` for the number and `Permanent ID` for the identity | ☐ |
| U18 | Read the buttons of a Proposal in To decide | Their text uses the number: `Approves Proposal P1 and changes the Model to match` (tooltip), not the identity | ☐ |
| U19 | Run **Trama: Update Agent Skills**, then `grep -l 'Never write a short number in a file' /tmp/trama-demo/shop/.agents/skills/trama-*/SKILL.md` | Four files: `trama-design`, `trama-scan`, `trama-implement`, `trama-import` | ☐ |
| U20 | Start a run of `trama-implement` on a Task (✓ with a real agent 🪙) and read its report | The agent names Tasks and Drifts as `Task T3 – title`, and every command it ran and every file it wrote uses the permanent identity: `ls $D/drifts` and the Task and Drift files hold no short number | ☐ |

## V. Faster agent runs

Start each block with ↻. `$D` and `j` are the ones of S4.

| # | Action | Expected | ✓ |
|---|---|---|---|
| V1 | `j task next --batch` | One Task per line, `<number> <title>`, at most four, the first being the one `j task next` names; no two of them concern the same thing (for example never `order` together with `order/Paid`). Nothing moves | ☐ |
| V2 | `j --json task next --batch` | `batch`: the same Tasks, each with `id`, `number` and `title` | ☐ |
| V3 | Move every Task in To do to Done with `j task move <id> done`, then `j task next --batch` and `j task next` | The two outputs are identical: `No Task is runnable.` and the Tasks left | ☐ |
| V4 | `j proposal show 1` before approving it | No `## Scan scope` section: it is written only on approval | ☐ |
| V5 | 🪙 With a real agent that has sub-agents, **Run all To do** with at least three Tasks on different Machines | The agent hands each Task of a group to a sub-agent, waits for all, asks `trama task next --batch` again, runs tests, lint and build once at the end, then scans the whole System and reports the Tasks and Drifts that scan filed | ☐ |

## W. Hold scan

Modalità echo (S2), con `trama.autoScan` acceso (il valore predefinito). Iniziare ogni blocco con ↻; `$D` e `j` sono quelli di S4. `<P1>` e `<P2>` sono le identità permanenti di Proposal P1 e P2, lette prima di approvarle con `j --json proposal show P1` e `j --json proposal show P2` (campo `id`). Gli scenari non sono ancora stati eseguiti nell'editor: annotare ciò che si osserva anche quando coincide con l'atteso.

| # | Action | Expected | ✓ |
|---|---|---|---|
| W1 | Leggere la barra di Diagram, Board e Requirements | In ognuna, subito dopo **Design…**, uno switch spento con etichetta `Hold scan`; nel Diagramma sta prima di **Scan**. Tooltip `When on, approvals wait and one scan runs when you turn it off.`; nome accessibile `Hold scan`, ruolo switch, stato spento (DevTools, Accessibility). `ls -A $D` non ha `scan-hold` | ☐ |
| W2 | Clic su **Hold scan** nella Board | Si accende subito, senza conferma; anche Diagram e Requirements lo mostrano acceso. `cat $D/scan-hold/state` → `on`; `cat $D/scan-hold/held` è vuoto; `cat $D/scan-hold/.gitignore` → `*` | ☐ |
| W3 | Board: **Approve** su Proposal P1 | La Proposal è approvata (G1.4–G1.8 valgono) ma **nessun** comando va al terminale. L'etichetta diventa `Hold scan · 1` sulle tre schede, nome accessibile `Hold scan, 1 held`. `cat $D/scan-hold/held` → `<P1>` | ☐ |
| W4 | Board: **Keep this** sotto **WHAT HAPPENS** del Drift D2 (accetta Proposal P2) | Nessun comando al terminale; `Hold scan · 2`; `held` ha `<P1>` e poi `<P2>`, una per riga | ☐ |
| W5 | Clic su **Scan System** | La solita riga `Use the trama-scan skill on the whole System.` nel terminale `Scan`; il contatore resta `Hold scan · 2` e `held` non cambia | ☐ |
| W6 | Clic su **Hold scan** per spegnerlo | Nel terminale **Scan** arriva **una sola** riga: ``Use the trama-scan skill on what Proposals <P1>, <P2> changed: each scan scope is in `trama proposal show <id>`. Compare every reference once, against the current Model, and link every Task you file with --proposal to the most recent of those Proposals whose scan scope covers it.``, senza nulla su trama-implement. Lo switch è spento, etichetta `Hold scan`; `state` → `off`, `held` vuoto | ☐ |
| W7 | ↻, accendere Hold scan, approvare solo P1, spegnere | Una sola riga, identica a quella di G1.3 per `<P1>` (con una Proposal è l'istruzione della scansione automatica) | ☐ |
| W8 | ↻, accendere e subito spegnere Hold scan | Nessun comando e nessun avviso; `state` → `off` | ☐ |
| W9 | ↻, accendere, approvare P1, poi `mv $D/model/checkout /tmp/checkout-away` e spegnere | Nessun comando; avviso `Hold scan is off. The held Proposals no longer affect any Feature, so there was nothing to scan.`; `state` → `off`, `held` vuoto. Rimettere la cartella con `mv /tmp/checkout-away $D/model/checkout` | ☐ |
| W10 | ↻, accendere, approvare P1. Poi `printf '{}\n' > /tmp/trama-demo/shop/.vscode/settings.json`, ricaricare la finestra, spegnere Hold scan e premere Esc nella richiesta del comando dell'agente (H18) | La richiesta compare una volta; dopo Esc nessun comando parte, lo switch resta acceso con `Hold scan · 1` e compare l'avviso `The held scan was not started, so Hold scan stays on.`; `held` ha ancora `<P1>`. Rimettere S2 | ☐ |
| W11 | ↻, accendere, poi `j proposal approve P1` dalla verification shell | La Proposal è approvata, nessuna scansione parte e il contatore resta `Hold scan`: la riga di comando non tocca il sospeso. Lo stesso per `j drift resolve D2 --accept-proposal` | ☐ |
| W12 | ↻, impostare `"trama.autoScan": false` in S2, ricaricare, accendere e approvare P1 | Nessun comando e nessun contatore: con la scansione automatica spenta non c'è nulla da mettere in sospeso | ☐ |
| W13 | ↻, poi `mkdir -p $D/scan-hold && echo maybe > $D/scan-hold/state` | Lo switch è spento sulle tre schede e compare una volta l'avviso `Trama could not read the Hold scan switch, so it is off.` | ☐ |
| W14 | ↻, `mkdir -p $D/scan-hold && chmod 555 $D/scan-hold`, poi clic su **Hold scan** | Lo switch resta spento e compare l'avviso `Trama could not save the Hold scan switch.`. Poi `chmod 755 $D/scan-hold` | ☐ |
| W15 | 🔍 In Cursor, con `trama.autoScan` acceso, accendere, approvare P1 e spegnere | L'istruzione va alla chat come ogni pulsante; se Cursor non riesce a crearla da sé ripiega sul deeplink e sugli appunti, mai sull'avviso **Scan now** | ☐ |

---

## L. Defect log

| Test ID | What you did | Expected | What happened | Severity |
|---|---|---|---|---|
| | | | | |

## Not covered

Licensing does not exist yet. Removing a whole Feature or Actor through a Proposal has unit tests only. The macOS `.vsix` has passed only CI checks, not a run on a real Mac. The Windows private-pipe bridge has not been exercised on Windows; the socket and native Quick Input paths have been exercised on Linux.
