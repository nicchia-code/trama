# UAT: Trama VS Code extension

Manual acceptance test, step by step. Every row is one action with one observable result. Expected values were read from the running views and from the CLI on the seeded demo, so they are exact. Mark the last column with ✓ (pass), ✗ (fail) or `~` (different from expected: write what you saw underneath).

## Automated run

A real VS Code (code-oss, same extension build, fish shell) was driven through the Chrome DevTools protocol, with the agent command replaced by a `printf >> file` so every launch could be counted and read back. The webview was also exercised in headless Chrome against the same bundle. Each result below says how it was obtained.

**Passed, and how it was driven**

| Area | Rows | Input used |
|---|---|---|
| Board text, badges, arrows, columns | E1 to E3 | Read from the DOM |
| Navigation from the board to the Diagram | E4 | DOM `.click()` on chips and links |
| Moving a Task | E5 (file results), E6 (name, move), E7 (nothing moved) | `DragEvent`s dispatched from script (synthetic), and a real Enter keypress. Native drag with a real mouse was verified only in headless Chrome: dropping on In progress posts `moveTask`, dropping on To decide posts nothing |
| Pending state of a moved card | E6.2, E6.3 logic | Headless Chrome, real Enter key: `aria-busy="true"`, class `is-pending`, opacity 0.5, `draggable=false`; a second Enter and a click send no second `moveTask`; released after about 5 s when the host never answers. Not seen on screen in VS Code, where the host answers in about 300 ms |
| Live updates and error banners | F1 to F7, F9, F10 | Files written from outside; DOM read. **F8 was not run** |
| Developer decisions | G1 to G10 | Buttons activated with DOM `.click()`; input boxes typed with real key events; results read from the files on disk |
| Agent launches | H1 to H19 | Buttons with DOM `.click()`; prompts read back from the log file |
| Empty project | J1 to J10 | Notification and modal buttons with DOM `.click()` |
| Keyboard focus rings | K4 | Real Tab key events, computed outline read |
| Canvas interactions | B2.1, B2.3, B3.2, B5, B6.2, B6.3, B10.1 to B10.3, B10.5, B10.6, B11.1, D1, D2 | Real mouse and key events sent to the webview at node positions read from the Cytoscape instance |
| Wheel zoom | B10.4 | In VS Code only a scripted `WheelEvent` (it moved the zoom by about 1 %). With a real wheel in headless Chrome the direction is right (3 ticks up: 1.200 to 1.242; 6 ticks down: 1.186), about 1.2 % per tick |

Buttons were activated through the DOM, not clicked with the real mouse, so a button that is covered, clipped or too small to hit is not covered by this run.

**Still to do by eye, or with a real agent:** B2.2, B4.6 (hover tooltips), B7.1 and B8.2 and C6.3 (how sub-States, the State level and a removed State look in VS Code; seen in Chrome only), B10.4 (does the wheel feel right), B10.9 and K3 (readability when wide or narrow), C4.2, D3.3, E5 and E7 with a real mouse in VS Code, how the pending card looks (E5.1, E6.2), F8, K1 for the Feature level in a light theme and the State level in both themes, a real-mouse click on each button, and all of part I.

**Findings:** (1) deleting and recreating `.trama/` made VS Code's file watcher stop reporting changes in some subfolders, so the demo reset now updates files in place; (2) the last breadcrumb is a button with `aria-current="page"`, clicking it does nothing, so B9.3 means "marked as current".


## 0. Conventions

- **↻ reset** means: run the reset command (S1). It restores the seeded state in about a second. It deletes every change you made under `.trama/` of the demo and leaves `.vscode/` and `.agents/` alone.
- **verification shell**: a normal terminal **outside** the Trama window, bash or zsh, with the two lines of S4 pasted. `j` points at this repo's build, so it never picks up an older `trama` from your PATH.
- **"the board"** is the Board tab. **"the panel"** is the right-hand side panel of the Diagram tab.
- Click means a single left click. Double-click means two quick clicks on the same node.
- Tests marked 🪙 spend model tokens. Everything else is free.
- Tests marked 🔍 are exploratory: the behaviour was never run, so note what you see even if it is not a failure.

## 1. Setup

| # | Action | Expected | ✓ |
|---|---|---|---|
| S1 | Run `cd /home/luca/Developer/Trama && TRAMA_DEMO_DIR=/tmp/trama-demo/shop bun run scripts/harness.ts` | Prints `wrote extension/dist/harness.html`. No error | ☐ |
| S2 | Run `printf '{\n  "trama.agentCommand": "echo {prompt}"\n}\n' > /tmp/trama-demo/shop/.vscode/settings.json` | File contains `"trama.agentCommand": "echo {prompt}"`. From now on the "agent" only prints its prompt | ☐ |
| S3 | Run `code --extensionDevelopmentPath=/home/luca/Developer/Trama/extension --new-window /tmp/trama-demo/shop` (skip if the window is already open) | A VS Code window titled `shop`. If a Welcome dialog appears, close it | ☐ |
| S4 | In the verification shell paste: `j() { /home/luca/Developer/Trama/dist/trama --root /tmp/trama-demo/shop "$@"; }` and `D=/tmp/trama-demo/shop/.trama` | No output. `j board` prints the board (see S5) | ☐ |
| S5 | Run `j board` | `To decide`: Proposal 0001, Proposal 0002, Drift 0001, Drift 0002 (Proposal 0002). `To do`: 0001, 0002. `In progress`: 0003. `Done`: 0004 | ☐ |

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
| Requirement Areas | `data` (sections order, payment) and `ui` (General, checkout, order/Paid) |

---

## A. Opening the panel

### A1. First open
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Press Ctrl+Shift+P, type `Trama`, look at the list | Four commands: **Trama: Open**, **Trama: Initialize Project**, **Trama: Design with Agent…**, **Trama: Scan System** | ☐ |
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
| 5 | Look at the toolbar | Left: `System`. Right: `Proposal` selector, buttons `−`, `+`, `Fit`, `Design…`, `Scan` | ☐ |
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
| 1 | Click the **Board** tab | Toolbar: **Run all To do** (blue), **Scan System**, **Design…** | ☐ |
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
| 1 | Read `0001` in To do | Title `Implement refunds for prepared orders`, chips `order/Refunding` and `order/Paid/user.CANCEL`, no excerpt, buttons **Show details**, **Run** (blue) and **Open**, arrows ← (disabled) and → | ☐ |
| 1b | Click **Show details** on `0001` | The body shows as Markdown in the card: `When a paid order is cancelled after preparation has started:`, a two-item list with **refunded** in bold, and `order/Refunding` in a code span; the button reads **Hide details** and its accessible name is `Hide details of task 0001` | ☐ |
| 1c | With the details open, make the Board refresh (move another Task) | `0001` stays open. Closing the panel and reopening it shows every card closed again | ☐ |
| 1d | Read `0002` in To do | No **Show details** button (the Task has no body). Task rows inside a design card have no details toggle either | ☐ |
| 2 | Read `0004` in Done | Badge `technical`, no chips, only **Open**, arrow ← enabled and → disabled | ☐ |
| 3 | Read `0003` in In progress | Chip `cart/Has items/user.CHECKOUT`, both arrows enabled | ☐ |

### E4. Links into the Diagram
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Proposal 0001 card: **View on diagram** | The Diagram tab opens with `0001` selected in the selector | ☐ |
| 2 | Board, Task 0001: click the chip `order/Refunding` 🔍 | By design the Diagram opens at `order`, breadcrumb `System › checkout › order`, and the State `Refunding` is selected. Not observed | ☐ |
| 3 | Board, Drift 0002: click `Proposal 0002 attached` | Diagram opens with `0002` selected | ☐ |
| 4 | Board, Drift 0001: **View on diagram** 🔍 | By design the Diagram opens at `order` with `Shipped` selected. Not observed | ☐ |
| 5 | Board, Task 0001: click the chip `order/Paid/user.CANCEL` 🔍 | By design the Diagram opens at `order` with the Transition(s) of Paid on `user.CANCEL` selected. Not observed: note what you see | ☐ |

### E5. Move a Task by dragging
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | ↻. Drag Task 0001 from To do and drop it on the In progress column | The card dims right away, then moves into In progress within about a second | ☐ |
| 2 | In the verification shell run `grep column $D/tasks/0001-*.md` | `column: doing` | ☐ |
| 3 | Drag it onto Done | Moves; file says `column: done` | ☐ |

### E6. Move a Task with the keyboard
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | ↻. Tab until the → button of Task 0002 is focused; read its accessible name (hover title or screen reader) | `Move task 0002 to In progress` | ☐ |
| 2 | Press Enter | The card dims, then moves to In progress; the focus stays on that card's buttons | ☐ |
| 3 | Press Enter twice quickly on another arrow | The second press is ignored while the first is pending | ☐ |
| 4 | `grep column $D/tasks/0002-*.md` | `column: doing` | ☐ |

### E7. Refused drop
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Drag a Task over the To decide column | Red dashed outline on the column while hovering | ☐ |
| 2 | Release | Nothing moves; no file changes | ☐ |

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
| 2 | Click **Show 3 tasks** | The button reads **Hide tasks**; three rows in creation order, each with a status dot, its ID, its title and ← → buttons (← disabled). Hovering a dot shows `To do` | ☐ |
| 3 | In the first row click → | The row's dot changes to `In progress`; the card moves to the In progress column, stays open, and its badge still says `0/3 done` | ☐ |
| 4 | In that row click → again | Badge `1/3 done`, the row's dot is `Done`; the card stays in In progress (a mix of To do and Done) | ☐ |
| 5 | Edit any file under `$D/tasks/` from outside (see F1) | The card stays open and in place after the refresh | ☐ |
| 6 | Try to drag the card onto another column | It cannot be dragged; nothing moves | ☐ |
| 7 | **Run this design** | The launch prints `Use the trama-implement skill on every Task of Proposal 0001 that is in the "todo" column, in order, one after the other. Stop at the first Drift you file.` | ☐ |
| 8 | Move the other two Tasks to Done (→ twice each) | The card moves to Done, badge `3/3 done`, **Run this design** is disabled with the tooltip `No Task of this design is in To do` | ☐ |
| 9 | Close the panel and open it again | The card is closed again | ☐ |
| 10 | `trama --root $D board` and `trama --root $D task list` | `board` lists `Proposal 0001 "Returns after shipping" (3/3 done)` once, in Done, with the three Tasks under it and their columns; `task list` lists the three Tasks flat, each with `(Proposal 0001)` | ☐ |
| 11 | Create a fourth Task with `--proposal 2` only (a second Proposal) | A design of one Task stays a plain card | ☐ |

### E11. Blocked Tasks
↻ first. Seed it from the verification shell: `j drift new "Refund amount differs" --ref order/Refunding --task 1 --happens "The code refunds late." --should "The Model refunds at once." --option "Refund at once" --option-text "Refund when the order is cancelled." --option "Queue the refund" --option-text "Keep the queue but refund within a minute."`, then `j drift new "Cancel differs" --ref order/Paid --happens "The code cancels twice." --should "The Model cancels once." --option "Cancel once" --option-text "Ignore a second cancel." --option "Reject the second cancel" --option-text "Answer it with an error."`. The harness seed already has blocked Tasks too (Tasks inside the design card, Task `0008` waiting for the fix Task `0009`); the new Drifts are 0006 and 0007. Task `0005`, taken by the agent, also gets the badge `blocked 0006`: blocking does not release it.
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Look at Task `0001` on the Board | Red badges `blocked 0006` (the Drift filed with `--task 1`) and `blocked 0007` (it refs `order/Paid/user.CANCEL`, inside `order/Paid`); both arrows and **Run** stay enabled | ☐ |
| 2 | Hover a badge, and read its accessible name | The tooltip says `Blocked by Drift 0006: Refund amount differs. Show it on the diagram.` | ☐ |
| 3 | Click `blocked 0006` | The Diagram tab opens at the `order` Machine with the red ghost `Drift 0006` selected and its panel shown | ☐ |
| 4 | Back on the Board, move `0001` with → | It moves to In progress and keeps its badges: the developer is never refused | ☐ |
| 5 | `j task move 1 doing`, and the same with `TRAMA_AGENT=1 j task move 1 doing` | The first prints `Task 0001 is now doing`; the second is refused naming `Drift 0006 "Refund amount differs"` and `Drift 0007`, saying the developer must decide; the Task is unchanged | ☐ |
| 6 | `j board`, `j task list`, `j task show 1` | `(blocked by Drift 0006) (blocked by Drift 0007)` after the title; `task show` also lists `Blocked by Drift 0006: Refund amount differs` and the same for 0007 | ☐ |
| 7 | `j drift show 6` | It does not list Task 0001 | ☐ |
| 8 | Click **Keep this** under **WHAT SHOULD HAPPEN** on Drift 0006 | Task `0001` goes back to To do and its badges become `waiting 0010` and `blocked 0007`; clicking `waiting 0010` scrolls to the fix Task's card and focuses it | ☐ |
| 9 | Move the fix Task `0010` to Done and click **Keep this** under **WHAT HAPPENS** on Drift 0007 | Task `0001` has no badge any more | ☐ |
| 10 | `j --json drift show 7`, then `j drift new "x" --ref order --task 99 --happens a --should b --option A --option-text a --option B --option-text b` | The first has `"origin": null` (filed without `--task`) and the two texts; the second fails with `No Task with ID "99"` and creates nothing | ☐ |

### E12. Ghosts of announced cards
Needs an agent that does not end by itself. Set `printf '{"trama.agentCommand": "bash -c \\"sleep 600\\" {prompt}", "trama.autoScan": false}\n' > /tmp/trama-demo/shop/.vscode/settings.json`, ↻, and reload the window so the extension reads the settings. `j` below is the verification shell's.
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Board: **Design…**, type `Add refunds after pickup`, Enter. Note the To decide count and the number on the Board tab | Within about a second a dashed, translucent skeleton appears in To decide after the last real Proposal and before the first Drift: kind `Proposal`, title `Add refunds after pickup`, the line `Preparing`, and a shimmer on its text lines | ☐ |
| 2 | Look at the To decide count and the number on the Board tab again | Both are as in row 1: a ghost is not counted | ☐ |
| 3 | Press Tab through the Board, then click the ghost | Focus never lands on it, the click does nothing, it has no buttons or links and cannot be dragged. Its accessible name is `Proposal the agent is creating, preparing: Add refunds after pickup` | ☐ |
| 4 | `ls -A $D/announcements` and `cat $D/announcements/*.md`, then `T=$(sed -n 's/^terminal: //p' $D/announcements/*.md)` | `.gitignore` and one `<id>.md` with `kind: proposal`, `source: request`, a `terminal:` line with six lowercase letters and digits (kept in `$T`) and the H1 `Add refunds after pickup`; `cat $D/announcements/.gitignore` prints `*` | ☐ |
| 5 | `j proposal new "Refunds after pickup"`; note the ID it prints, `<P>` | No note in the output. The same ghost (no second one) now reads title `Refunds after pickup` and the line `Writing` | ☐ |
| 6 | `j proposal submit <P>` | The ghost disappears and the real card of that Proposal stands in its place; the count and the badge go up by one; no notice appears | ☐ |
| 7 | `A=$(j announce task "Refund prepared orders")` | A ghost of kind `Task` and line `Preparing` stands in To do after the real cards, with the count of To do unchanged | ☐ |
| 8 | `j task new "Refund prepared orders" --ref order/Refunding --announcement $A` | The ghost gives way to the real card, at the same place; `ls -A $D/announcements` shows only `.gitignore` | ☐ |
| 9 | `j announce drift "Cart differs"` | A `Drift` ghost stands in To decide after the last real Drift. It belongs to no terminal (`terminal: null` in its file) | ☐ |
| 10 | `j task new "Unannounced" --ref order --announcement zzzzzz` | The Task is created and the output adds `No announcement "zzzzzz" was found …`; no ghost appears or is left | ☐ |
| 11 | `TRAMA_TERMINAL=$T j announce task "Left behind"`, then in the **Trama agent** terminal press Ctrl+C | The `Task` ghost disappears at once. At the top of the Board one notice, `The agent finished without delivering Task Left behind.`, with a **Close** button. The `Drift` ghost of row 9 stays: it belongs to no terminal | ☐ |
| 12 | Click **Close** on the notice, switch to the Diagram tab and back | The notice is gone; closing the Trama tab and opening it again shows none | ☐ |
| 13 | `j proposal new "Never finished"`, read the ghost, then `j proposal discard <ID it printed>` | A `Writing` ghost titled `Never finished`; after the discard it disappears and **no** notice is shown | ☐ |
| 14 | `j announce task "Gone quiet"`, then edit its file under `$D/announcements` and set `touched` to a time 20 minutes ago, save | Within about 30 seconds the ghost disappears and the notice `The agent finished without delivering Task Gone quiet.` appears; the `Drift` ghost of row 9, which also belongs to no terminal, goes with it, with its own notice | ☐ |
| 15 | `j announce task "Before reload"`, then Developer: Reload Window and open the Board | The ghost is not there and no notice is shown: leftovers are withdrawn at startup | ☐ |
| 16 | Set `printf '{"trama.agentLauncher": "chat", "trama.autoScan": false}\n' > /tmp/trama-demo/shop/.vscode/settings.json`, reload, **Design…** with any text | The prompt goes to the chat (or the clipboard) and **no** ghost appears | ☐ |
| 17 | `j proposal new "From the chat"` | A `Writing` ghost titled `From the chat` appears: with the chat launcher the ghost starts with the Draft | ☐ |
| 18 | 🪙 With a real agent (section I) ask for a design that needs questions | While its question round is open every ghost reads `Waiting for your answers`; they go back to `Preparing` or `Writing` when the round closes | ☐ |
| 19 | Restore S2. ↻, drag Task 0001 onto In progress (E5) | The card dims and moves; no dashed copy of it appears in In progress at any moment | ☐ |

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

For every G test, ↻ first, then open the panel and the "Trama agent" terminal panel.

### G1. Approve a Proposal from the Board
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Board: **Approve** on Proposal 0001 | The card leaves To decide (count 3). No error banner | ☐ |
| 2 | Look at the bottom panel | A terminal named **Trama agent** opens in the project folder | ☐ |
| 3 | Read the terminal | Exactly **one** command was sent and one line printed: ``Use the trama-scan skill on the Feature `checkout`.`` | ☐ |
| 4 | Verification shell: `j validate` | `The Model and its Requirements are valid.` | ☐ |
| 5 | `grep -c Returned $D/model/checkout/order.md` | `2` | ☐ |
| 6 | `ls $D/model/checkout` | `cart.md feature.md order.md payment.md return.md` | ☐ |
| 7 | `grep -n RETURN $D/model/actors/user.md` | A line `### RETURN` | ☐ |
| 8 | `grep status $D/proposals/0001-*/proposal.md` | `status: approved` | ☐ |
| 9 | Diagram, System level, selector `None` | User now has `4 events`; Checkout has `4 machines`; no ghosts for 0001 | ☐ |
| 10 | Selector | `0001` is no longer listed | ☐ |

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

Each launch sends one command to the terminal named **Trama agent** (cwd = the demo folder) and the shell prints the prompt.

| # | Action | Expected in the terminal | ✓ |
|---|---|---|---|
| H1 | Board: **Scan System** | `Use the trama-scan skill on the whole System.` | ☐ |
| H2 | Diagram, System level: **Scan** | `Use the trama-scan skill on the whole System.` | ☐ |
| H3 | Diagram, Feature level `checkout`: **Scan** | ``Use the trama-scan skill on the Feature `checkout`.`` | ☐ |
| H4 | Diagram, Machine level `order`: **Scan** | Same as H3 (the current Feature) | ☐ |
| H5 | Board: **Design…** | Input box titled `Design with Agent`, prompt `What should the agent design or change in the Model?`, placeholder `Add a cancelled state to orders…` | ☐ |
| H6 | In H5 press Enter with the box empty | `Describe what to design` | ☐ |
| H7 | In H5 type `Add refunds with $HOME and 'quotes'`, Enter | The printed line is exactly `Use the trama-design skill. Add refunds with $HOME and 'quotes'` (the `$HOME` is **not** expanded, the quotes survive) | ☐ |
| H8 | Click **Design…** and press Esc | Nothing is printed | ☐ |
| H9 | Diagram toolbar **Design…** | Same input box and result as H5–H7 | ☐ |
| H10 | Board, Task 0001: **Run** | `Use the trama-implement skill on Task 0001.` | ☐ |
| H11 | Board: **Run all To do** | `Use the trama-implement skill on every Task in the "todo" column, in order, one after the other. Stop at the first Drift you file.` | ☐ |
| H12 | Move Task 0001 and 0002 to In progress (E5), look at **Run all To do**, then ↻ | The button is **disabled** while To do is empty | ☐ |
| H13 | Palette: **Trama: Scan System** | A quick pick with placeholder `What should the agent scan?` and two entries: `Whole System` and `Checkout` (description `checkout`) | ☐ |
| H14 | Choose `Checkout`, then repeat and choose `Whole System` | ``…on the Feature `checkout`.`` then `…on the whole System.` | ☐ |
| H15 | Palette: **Trama: Design with Agent…** | Same input box as H5 | ☐ |
| H16 | After H1 to H15, open the terminal dropdown | **One** terminal named `Trama agent`: each of these launches ended before the next, so every launch reused it. If an earlier command is still running (for example an agent), the next launch opens a new terminal instead | ☐ |
| H17 | Set `printf '{"trama.agentCommand": "echo"}\n' > /tmp/trama-demo/shop/.vscode/settings.json` (no `{prompt}`), click **Scan System** | The prompt is appended: `Use the trama-scan skill on the whole System.` | ☐ |
| H18 | Set `printf '{}\n' > /tmp/trama-demo/shop/.vscode/settings.json`, click **Scan System** | An input box `Trama: agent command`, placeholder `claude {prompt}    or    codex {prompt}`. With empty text: `Enter the command that starts your agent`. **Press Esc**: nothing is launched. (Typing a command would save it in your *user* settings.) | ☐ |
| H19 | Restore S2. Set `printf '{"trama.agentCommand": "echo {prompt}", "trama.autoScan": false}\n' > /tmp/trama-demo/shop/.vscode/settings.json`, ↻, approve Proposal 0001 | The Proposal is approved (G1.1, G1.4–G1.8 hold) but **no** command is sent to the terminal | ☐ |
| H20 | Restore S2 (settings back to `echo {prompt}`) | | ☐ |
| H21 | Set `printf '{"trama.agentCommand": "echo {prompt}", "trama.autoScan": false, "trama.language": " Italian "}\n' > /tmp/trama-demo/shop/.vscode/settings.json`, ↻, click **Scan System** | One line, ending `Use the trama-scan skill on the whole System. Write everything you generate in Italian, except code, which always stays in English.` (the typed text is trimmed). The same ending appears after **Run all To do**, **Run** on a Task, **Design…** (after the request) and **Rework** of a stale Proposal | ☐ |
| H22 | Change `trama.language` to `"   "` (spaces only), ↻, click **Scan System** | The line is exactly `Use the trama-scan skill on the whole System.`, with nothing about language | ☐ |
| H23 | Restore S2 (settings back to `echo {prompt}`, no `trama.language`) | | ☐ |

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
| I7 | While omp is still running in the terminal, click **Scan System** again | A **new** terminal named `Trama agent` opens and runs the command there; the running omp receives nothing. (Before this was fixed the command line was typed into omp as a message.) Once every command has finished, the next launch reuses the last terminal instead of opening another. Reproduced the old bug twice and verified the fix with a slow command; not yet repeated with omp itself | ☐ |
| I8 | Quit omp. **Design…** with `Orders can also be returned` | omp reads the `trama-design` skill and explores the Model. Because Proposal 0001 already covers part of this, it asks you with a menu (options such as replacing or extending 0001) and **waits for your answer**. Pick an option; omp then writes a Proposal that appears in To decide as soon as the file exists, with its changes listed. Ran against a real omp as far as the question; the answer and the new Proposal still need a human | ☐ |
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
| K5 | Hover disabled buttons | Disabled **Approve** shows its reason; disabled → arrows do not react | ☐ |

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

---

## M. Requirements

| # | Action | Expected | ✓ |
|---|---|---|---|
| M1 | Click the **Requirements** tab | Two Areas, **Data** (`requirements/data`) and **Interface** (`requirements/ui`), each with its italic "Use when…" line, its sections and **Open file**. The Proposal selector is disabled (no open Proposal touches Requirements) | ☐ |
| M2 | Click the section title **order/Paid** | The Diagram opens on `order` with Paid selected; the panel ends with **Requirements → Interface** and the two Paid lines | ☐ |
| M3 | In the panel, click **Interface** | The Requirements tab shows only `order/Paid`, with "Showing requirements/ui#order/Paid" and **Show all** | ☐ |
| M4 | Verification shell: `j state order/Preparing` | Ends with `## Requirements`: `requirements/ui#order/Paid (via order/Paid)`, `requirements/data#order (via order)`, `requirements/ui#checkout (via checkout)` | ☐ |
| M5 | `ls /tmp/trama-demo/shop/.agents/skills` after `j skills update` | `trama-req-data` and `trama-req-ui` next to the three Trama skills; `trama-req-ui/SKILL.md` has `description: Use when building or changing screens…` | ☐ |
| M5b | `mkdir /tmp/trama-demo/shop/.agents/skills/trama-fix` with a file inside, and the same under `.claude/skills`, then `j skills update` | The output has a line `Deleted the retired trama-fix skill:` naming both folders; neither exists any more. Running it again prints no `Deleted` line. In the editor, **Trama: Update Agent Skills** shows the same line in its notification | ☐ |
| M6 | Edit `.trama/requirements/ui.md` by hand: change "Mobile first" to "Mobile first, always" and save | Within a second `.agents/skills/trama-req-ui/SKILL.md` says "Mobile first, always". The Requirements tab shows the new text | ☐ |
| M7 | Append `## order/Lost` and a line to `ui.md`, save | The yellow bar: "The Model or its Requirements have 1 validation error"; the link `requirements/ui.md:<line>` opens `ui.md`. Remove the section again: the bar disappears | ☐ |
| M8 | `j proposal new "Blue badge"`, then `j proposal edit <id> requirements/ui.md`, change "green" to "blue" in the printed file and `j proposal submit <id>` | On the Board the submitted card lists `requirements/ui.md ~1` and has **View requirements**, not **View on diagram** | ☐ |
| M9 | Click **View requirements** | Requirements tab with the Proposal selected: `order/Paid` has a **changed** badge, the old text struck through above the new one | ☐ |
| M10 | `j proposal edit <id> checkout/order.md`, delete the `### Paid` State and its sub-States in the printed file, then `j validate --proposal <id>` and `j proposal submit <id>` | The edit withdraws it into Draft. Both commands fail with the missing State and Requirement errors; it is absent from the selectors and decision count | ☐ |
| M11 | `j proposal discard <id>` | The Draft is discarded; `ui.md` and the skill unchanged | ☐ |

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

Use the [question request contract](./cli.md#question-rounds) for native `trama_ask`, MCP `tools/call`, or `trama ask --root /tmp/trama-demo/shop < round.json`. Include single-choice and multiple-choice questions, with different recommendations.

| # | Action | Expected | ✓ |
|---|---|---|---|
| P1 | Submit a valid round, then switch focus away and back | Native top-of-window Quick Pick opens without clicking a notification and remains open across focus loss. Title identifies Copilot, the MCP client's name or `trama ask`; supplied text and descriptions are unchanged | ☐ |
| P2 | Submit a round whose later question has an out-of-range recommendation | Identified `invalid-input` error; no earlier question is presented | ☐ |
| P3 | Accept a non-recommended choice, advance, then use Back | The preceding answer is restored rather than resetting to its recommendation; accepting a revision replaces it | ☐ |
| P4 | Select ordinary multi-choice options and Other; accept blank text, then enter text | Blank text stays in the input with visible feedback; the completed answer contains both original selected labels and free text, without recommendation markers | ☐ |
| P5 | Escape from free input; Escape from the question; Escape from skip confirmation | Each returns to the same question without accepting text or skipping it | ☐ |
| P6 | Accept the first question; skip one; then Skip all | Prior accepted answer is preserved; only explicitly skipped questions have skipped entries. Result returns immediately, without Send | ☐ |
| P7 | Start two rounds in one window; cancel the queued caller, then cancel the active caller with another round queued | Cancelling the queued caller preserves the active controls. Cancelling the active caller disposes them and opens the next FIFO round, with no orphan prompt | ☐ |
| P8 | Leave a multi-question native round at free input after one accepted answer; queue CLI and MCP rounds; remove or rename `.trama/` in the fixture | All three return `editor-interrupted`, no answers, and the controls disappear; queued questions never appear | ☐ |
| P9 | Close the editor with a CLI round active and an MCP round queued | Both return `editor-interrupted`; a later new request without an editor returns `unavailable`, not an interruption or skipped answers | ☐ |
| P10 | Keep a round pending in one window while completing one in another; change focus between same-project windows | Windows remain independent. Discovery chooses the most recently focused live window; an endpoint supplied by a Trama-launched terminal takes precedence | ☐ |
| P11 | Leave an MCP round pending, send ping and another tool request, then cancel by request ID | Other requests respond before the round completes; cancellation affects only that request and the MCP server keeps serving | ☐ |
| P12 | Read the three shipped interview skills and exercise an explicit skip, initial absence and admitted-round interruption | Skips are reported as assumptions, initial absence alone permits agent-specific fallback, and interruption stops the workflow without retry or creating work from unanswered decisions | ☐ |

---

## L. Defect log

| Test ID | What you did | Expected | What happened | Severity |
|---|---|---|---|---|
| | | | | |

## Not covered

Licensing does not exist yet. Removing a whole Feature or Actor through a Proposal has unit tests only. The macOS `.vsix` has passed only CI checks, not a run on a real Mac. The Windows private-pipe bridge has not been exercised on Windows; the socket and native Quick Input paths have been exercised on Linux.
