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
| Agent launches | H1 to H16, H20 to H23a | Buttons with DOM `.click()`; prompts read back from the log file |
| Empty project | J1 to J10 | Notification and modal buttons with DOM `.click()` |
| Keyboard focus rings | K4 | Real Tab key events, computed outline read |
| Canvas interactions | B2.1, B2.3, B3.2, B5, B6.2, B6.3, B10.1 to B10.3, B10.5, B10.6, B11.1, D1, D2 | Real mouse and key events sent to the webview at node positions read from the Cytoscape instance |
| Wheel zoom | B10.4 | In VS Code only a scripted `WheelEvent` (it moved the zoom by about 1 %). With a real wheel in headless Chrome the direction is right (3 ticks up: 1.200 to 1.242; 6 ticks down: 1.186), about 1.2 % per tick |

Buttons were activated through the DOM, not clicked with the real mouse, so a button that is covered, clipped or too small to hit is not covered by this run.

**Still to do by eye, or with a real agent:** B2.2, B4.6 (hover tooltips), B7.1 and B8.2 and C6.3 (how sub-States, the State level and a removed State look in VS Code; seen in Chrome only), B10.4 (does the wheel feel right), B10.9 and K3 (readability when wide or narrow), C4.2, D3.3, E5.2 with a real mouse in VS Code, F8, K1 for the Feature level in a light theme and the State level in both themes, a real-mouse click on each button, and all of part I.

**Findings:** (1) deleting and recreating `.trama/` made VS Code's file watcher stop reporting changes in some subfolders, so the demo reset now updates files in place; (2) the last breadcrumb is a button with `aria-current="page"`, clicking it does nothing, so B9.3 means "marked as current".


## 0. Conventions

- **Agent and editor.** The only supported agent is omp and the only supported editor is VS Code with the Trama extension; every row runs there, and the agent in the rows is always omp.
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
| S2 | Make sure omp is installed, with no model roles (`trama.analysis`, `trama.scan`, `trama.execution`) | Every Trama instruction starts omp in a new integrated terminal | ☐ |
| S3 | Run `code --extensionDevelopmentPath=/home/luca/Developer/Trama/extension --new-window /tmp/trama-demo/shop` (skip if the window is already open) | A VS Code window titled `shop`. If a Welcome dialog appears, close it | ☐ |
| S4 | In the verification shell paste: `j() { /home/luca/Developer/Trama/dist/trama --root /tmp/trama-demo/shop "$@"; }` and `D=/tmp/trama-demo/shop/.trama` | No output. `j project show` prints the board (see S5) | ☐ |
| S5 | Run `j project show` | `To decide`: Proposal `P1`, Proposal `P2`, Drift `D1`, Drift `D2` (Proposal `P2`). `To do`: `T1`, `T2`. `In progress`: `T3`. `Done`: `0004` (its identity, because it has no number) | ☐ |

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

Startup regression check: open the panel, switch through Diagram, Board and Requirements, then close and reopen it. The System data must load again, with no blank page or JavaScript errors. The editor webview must enable scripts; the browser harness alone cannot catch a disabled-script panel. Verified in a real Code - OSS extension development host against `examples/shop`.

| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Press Ctrl+Shift+P, type `Trama`, look at the list | Among them: **Trama: Open**, **Trama: Import from Code**. No **Trama: Scan System** (the whole System is scanned from **Scan System** in the side menu), no initialize command (no **Trama: Initialize Project**) and no design command: design requests start only from the Board button (**Add Work Item…**). **Trama: Send to agent (closing the tab sends it too)** is not in the list | ☐ |
| 2 | Run **Trama: Open** | One new editor tab titled `Trama`, in the editor area | ☐ |
| 3 | Look at the top of the panel | No tab bar and no Settings wheel; the panel shows one view, chosen from the side menu (**Board** carries the grey number `4` there) | ☐ |
| 4 | Look at the top of the panel | No red banner | ☐ |
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

### B1. Whole System level
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Open the Diagram, click `Whole System` (double click or ↗) on the root, selector `None` | Four purple pill nodes on the left, top to bottom: `Courier · 1 event`, `Stripe · 3 events`, `User · 3 events`, `Warehouse · 1 event` | ☐ |
| 2 | Look at the box on the right | `Checkout` with the text `3 machines · ⚠ 2 drifts inside`, a **red** outline, and a small ↗ icon at its right edge | ☐ |
| 3 | Look at the edges | Four grey edges Actor → Checkout, labelled `1` (Courier), `3` (Stripe), `3` (User), `1` (Warehouse) | ☐ |
| 4 | Look under Checkout | Two red dashed pill nodes `Drift 0001` and `Drift 0002`, each with a dashed red edge going up to Checkout | ☐ |
| 5 | Look at the toolbar | Left: `System`. Right: `Proposal` selector, buttons `−`, `+`, `Fit`. No **Scan** and no button that starts the agent: the System is scanned from **Scan System** in the side menu. No **Add Work Item…** here: it is on the Board only | ☐ |
| 6 | Look at the panel | `SYSTEM`, `Shop`, `An online shop selling printed books to private customers.`, then `FEATURES` with the link `Checkout` and `3 machines` under it | ☐ |
| 7 | Look at the bottom-left legend | `Legend` (collapsible, open) with six entries: Proposal adds it, Proposal removes it, Proposal changes it, Drift, Initial State, Final State | ☐ |
| 8 | Click the `Legend` header | It collapses to its title; click again to expand | ☐ |

### B2. Inspect a Feature
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Click the `Checkout` box once | The box gets a blue outline and a darker blue fill. The panel shows `FEATURE`, `Checkout`, `From a filled cart to a delivered order, including payment and cancellation.`, buttons **Drill in** and **Open file**, then `MACHINES`: `cart · 3 states`, `order · 8 states`, `payment · 6 states` | ☐ |
| 2 | Hover the box | A tooltip with the description appears | ☐ |
| 3 | Click an Actor node, for example `User` 🔍 | Not observed. By design the panel shows that Actor and its Events, and nothing is drilled into | ☐ |
| 4 | Press Escape with the diagram focused | Selection is cleared; the panel goes back to the System description. With a focus bar showing, a second Escape takes the focus off (the bar, the dimming and the highlights go; level and position stay) | ☐ |

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
| 2 | Board tab | The submitted Proposal is in Work Items; the existing draft remains outside the decision count | ☐ |
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
| 5 | `j project show`, then `j proposal discard <id>` | `j project show` lists the Draft under **In writing** marked `(draft)`; after the discard it is marked discarded and never enters To decide | ☐ |
| 6 | ↻ reset when done | | ☐ |

---

## D. Drifts on the Diagram

### D1. A Drift without a Proposal
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Machine level `order`, click the red `Drift 0001` ghost | Panel `DRIFT 0001`, title `Code refunds after the package is picked up`, two columns: **WHAT HAPPENS** with `A shipped order is still refunded after the courier has picked the package up.` (**shipped** in bold) and a two-item bulleted list, and **WHAT SHOULD HAPPEN** `Model` with `A shipped order can no longer be refunded…` (bold) and a `the refund policy` link; `POINTS AT` `order/Shipped` | ☐ |
| 2 | Look for controls under the two sides | None: no **Keep this**, no Fix options, no note field, no **Where in the code**, no attached Proposal box. Drifts are decided only with **Resolve Drifts** | ☐ |
| 3 | Narrow the panel | The two sides stack, **WHAT HAPPENS** first, and the panel does not scroll sideways | ☐ |
| 4 | Click the link in **WHAT SHOULD HAPPEN** (harness: `window.__posts`) | The webview does not navigate; it posts `{ type: "openLink", url: "https://example.com/policy" }`. In VS Code the system browser opens the address | ☐ |

### D2. A Drift with an attached Proposal
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | System level, click `Drift 0002` | Panel shows `DRIFT 0002`, `Code has a Written off payment`, the two sides, `POINTS AT` `payment`; no button to decide and no attached Proposal box | ☐ |
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
| 1 | Clic sulla scheda **Board** | Barra: **Run all** (blu), **Scan System**, **Add Work Item…**, con gli stessi tooltip di B1.5. In fondo a Work Items c'è solo **+ Work Item**; in fondo a Ready c'è solo **Run all**; In progress e Done non hanno pulsanti in fondo | ☐ |
| 2 | Look at the columns | `WORK ITEMS 4`, `READY 2`, `IN PROGRESS 1`, `DONE 1`, each with a count badge | ☐ |

### E2. Work Items
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Read the first card | `Proposal 0001`, `Returns after shipping`, rows `actors/user.md +1`, `checkout/order.md +2 ~2`, `checkout/return.md +5`, buttons **View on diagram**, **Approve** (blue), **Reject**; a blue left border | ☐ |
| 2 | Read the second card | `Proposal 0002`, `Orders can be lost in transit`, `checkout/payment.md +1` | ☐ |
| 3 | Read the third card | `Drift 0001`, title, chip `order/Shipped`, the two sides side by side (stacked when the panel is narrow) and **View on diagram**; no **Keep this**, Fix options, note, attached Proposal or Where in the code; a red left border | ☐ |
| 4 | Read the fourth card | `Drift 0002`, chip `payment`, the two sides and **View on diagram**; nothing shows its attached Proposal | ☐ |

### E3. Task cards
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Read `0001` in Ready | Title `Implement refunds for prepared orders`, chips `order/Refunding` and `order/Paid/user.CANCEL`, no excerpt, buttons **Show details**, **Run** (blue) and **Open**, and no move arrows | ☐ |
| 1b | Click **Show details** on `0001` | The body shows as Markdown in the card: `When a paid order is cancelled after preparation has started:`, a two-item list with **refunded** in bold, and `order/Refunding` in a code span; the button reads **Hide details** and its accessible name is `Hide details of task 0001` | ☐ |
| 1c | With the details open, make the Board refresh (`j task move 2 doing`) | `0001` stays open. Closing the panel and reopening it shows every card closed again | ☐ |
| 1d | Read `0002` in Ready | No **Show details** button (the Task has no body) | ☐ |
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
Needs the real omp agent configured in S2 for row 6; the other rows need none.
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | ↻. Look at every Task card and the Proposal tag on each | No ← → buttons, no **Take back** button and no button that removes a card; no card has the `draggable` attribute | ☐ |
| 2 | Try to drag Task 0001 over In progress, over Work Items and over its own column | Nothing is dragged: no outline appears on any column and `grep column $D/tasks/0001-*.md` still says `column: todo` | ☐ |
| 3 | Press Tab through the Board | Focus reaches only **Show details**, **Run**, **Open**, the links and badges, and the buttons of Proposals and Drifts; none of them moves a Task | ☐ |
| 4 | `j task move 1 doing` | Within about a second the card is in In progress. At no moment is it dimmed or marked busy, and no error appears | ☐ |
| 5 | `TRAMA_AGENT=1 j task move 2 doing` | The dot of Task 0002 pulses in the accent colour and its label is `Agent working`; there is no badge and no **Take back** button. **Run all** is disabled with the tooltip `An agent is working on Task 0002` | ☐ |
| 6 | `j task move 2 done` (as the developer), then `j task move 2 doing` | The first is refused: the message says the agent is working on Task 0002 and points to `trama task move 2 doing` only. The second takes the Task back and clears the mark: the dot stops pulsing, Task 0002 stays In progress and **Run all** is enabled again | ☐ |
| 7 | Start an agent that does not end by itself (E12), `TRAMA_AGENT=1 j task move 2 doing`, then press Ctrl+C in the **Design** terminal | Task 0002 goes back to Ready with its dot no longer pulsing; no Take back is needed | ☐ |

### E8. Open a Task
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Task 0003: **Open** | `tasks/0003-cart-confirmation.md` opens beside the panel, front matter with `column: doing` | ☐ |

### E9. Badges
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Do F4 (stale) and look at the Proposal 0001 card | Orange badge `stale`; **Approve** disabled; hover shows a tooltip naming `checkout/order.md` | ☐ |

### E10. Proposal tag on Task cards
↻ first. Then seed it from the verification shell (the Proposal only has to exist): `trama --root $D task new "Return request" --ref order --proposal 1`, then the same with `"Refund on return"` and `"Return label"`. Checked in the browser harness with a hand-made snapshot; not yet run inside VS Code.
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Look at the Board after the three commands | Three separate cards in To do, one per Task, each with the tag of Proposal 0001 and its title `Returns after shipping`; no design card, no `0/3 done` counter and no **Show 3 tasks** button | ☐ |
| 2 | Read the tag on one card | It shows the Proposal's short number, or `0001` when it has none, with the title `Returns after shipping`. The number and the ID are never both shown | ☐ |
| 3 | Look at the buttons of each card | **Run** (blue) and **Open** (and **Show details** where the Task has a body); no **Run this design** anywhere on the Board | ☐ |
| 4 | `j task move <id of the first> doing` | Within about a second that card is In progress; the other two stay in Ready with their tags | ☐ |
| 5 | `j task move <id of the first> done` | That card moves to Done with its tag; the other two stay in Ready | ☐ |
| 6 | Edit any file under `$D/tasks/` from outside (see F1) | The cards stay in place after the refresh | ☐ |
| 7 | Try to drag a card onto another column | It cannot be dragged; nothing moves | ☐ |
| 8 | **Run** on one of the three cards | The terminal prints `Use the trama-implement skill on Task <id>.` for that Task only | ☐ |
| 9 | `trama --root $D board` and `trama --root $D task list` | `board` lists each of the three Tasks on its own line, in its column, with the tag of Proposal 0001 and its title, and no `design` entry; `task list` lists the three Tasks flat, each with `(Proposal 0001)` | ☐ |
| 10 | Create a fourth Task with `--proposal 2` only (a second Proposal) | It carries the tag of Proposal 0002 and its title, like the others; a Task with no `--proposal` has no tag | ☐ |

### E11. Blocked Tasks
↻ first. Seed it from the verification shell: `j drift new --input '{"title":"Refund amount differs","refs":["order/Refunding"],"task":"1","happens":"The code refunds late.","should":"The Model refunds at once.","where":"src/refund.ts","options":[{"title":"Refund at once","text":"Refund when the order is cancelled."},{"title":"Queue the refund","text":"Keep the queue but refund within a minute."}]}'`, then `j drift new --input '{"title":"Cancel differs","refs":["order/Paid"],"happens":"The code cancels twice.","should":"The Model cancels once.","where":"src/cancel.ts","options":[{"title":"Cancel once","text":"Ignore a second cancel."},{"title":"Reject the second cancel","text":"Answer it with an error."}]}'`. The harness seed already has blocked Tasks too (Tasks tagged with a Proposal, Task `0008` waiting for the fix Task `0009`); the new Drifts are 0006 and 0007. Task `0005`, taken by the agent, also gets the badge `blocked 0006`: blocking does not release it.
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Look at Task `0001` on the Board | Red badges `blocked 0006` (the Drift filed with `task` `1`) and `blocked 0007` (it refs `order/Paid/user.CANCEL`, inside `order/Paid`); **Run** stays enabled | ☐ |
| 2 | Hover a badge, and read its accessible name | The tooltip says `Blocked by Drift 0006: Refund amount differs. Show it on the diagram.` | ☐ |
| 3 | Click `blocked 0006` | The Diagram tab opens at the `order` Machine with the red ghost `Drift 0006` selected and its panel shown | ☐ |
| 4 | `j task move 1 doing` as the developer (no `TRAMA_AGENT`) | It moves to In progress and keeps its badges: the developer is never refused | ☐ |
| 5 | `j task move 1 doing`, and the same with `TRAMA_AGENT=1 j task move 1 doing` | The first prints `Task 0001 is now doing`; the second is refused naming `Drift 0006 "Refund amount differs"` and `Drift 0007`, saying the developer must decide; the Task is unchanged | ☐ |
| 6 | `j project show`, `j task list`, `j task show 1` | `(blocked by Drift 0006) (blocked by Drift 0007)` after the title; `task show` also lists `Blocked by Drift 0006: Refund amount differs` and the same for 0007 | ☐ |
| 7 | `j drift show 6` | It does not list Task 0001 | ☐ |
| 8 | Click **Keep this** under **WHAT SHOULD HAPPEN** on Drift 0006 | Task `0001` goes back to Ready and its badges become `waiting 0010` and `blocked 0007`; clicking `waiting 0010` scrolls to the fix Task's card and focuses it | ☐ |
| 9 | Move the fix Task `0010` to Done and click **Keep this** under **WHAT HAPPENS** on Drift 0007 | Task `0001` has no badge any more | ☐ |
| 10 | `j --json drift show 7`, then `j drift new --input '{"title":"x","refs":["order"],"task":"99","happens":"a","should":"b","where":"w","options":[{"title":"A","text":"a"},{"title":"B","text":"b"}]}'` | The first has `"origin": null` (filed without `task`) and the two texts; the second fails with `No Task with ID "99"` and creates nothing | ☐ |
| 11 | ↻, seed the two Drifts again, then `j task list --input '{"runnable":true}'`, then `j task list --input '{"column":"todo"}'` | `Next Task: 0002 Payment declined email`: the lowest Task in To do that is not blocked, skipping `0001`. The command moved nothing: `task list` still shows `0001`, `0002`, `0006`, `0008` and `0009` in `todo` | ☐ |
| 12 | `j task list --input '{"runnable":true,"proposals":["3"]}'`, then the same with `"99"` | The first prints `No Task is runnable in Proposal 0003.`, a blank line, `Still in To do:` and `- 0006 Return request (Proposal 0003) (blocked by Drift 0003)`, and exits with `0`. The second fails with `No Proposal with ID "99"` and exits with `1` | ☐ |
| 13 | `j task move 2 doing` as the developer (no `TRAMA_AGENT`), then `j task list --input '{"runnable":true}'` | The second prints `No Task is runnable.`, a blank line, `Still in To do:` and one line for each of `0001`, `0006`, `0008` and `0009`, each with its marks, for example `- 0008 Order confirmation email (waiting for Task 0009) (blocked by Drift 0005)`. It exits with `0` | ☐ |
| 14 | `j --json task list --input '{"runnable":true}'` | `"next": null` and a `waiting` list with the same four Tasks, each with its `blockedBy` | ☐ |

### E12. Ghosts of announced cards
Needs an omp agent that does not end by itself. Set `"trama.autoExit": false` in your **user** settings; ↻ and reload the window. `j` below is the verification shell's.
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Board: **Add Work Item…**, type `Add refunds after pickup`, close the tab (it is sent). Note the Backlog count and the number on the Board tab | Within about a second a dashed, translucent skeleton appears at the bottom of Backlog, after the last real card and before **+ Add Work Item**: kind `Proposal`, title `Add refunds after pickup`, the line `Preparing`, and a shimmer on its text lines | ☐ |
| 2 | Look at the Backlog count and the number on the Board tab again | Both are as in row 1: a ghost is not counted | ☐ |
| 3 | Press Tab through the Board, then click the ghost | Focus never lands on it, the click does nothing, it has no buttons or links and cannot be dragged. Its accessible name is `Proposal the agent is creating, preparing: Add refunds after pickup` | ☐ |
| 4 | `ls -A $D/announcements` and `cat $D/announcements/*.md`, then `T=$(sed -n 's/^terminal: //p' $D/announcements/*.md)` | `.gitignore` and one `<id>.md` with `kind: proposal`, `source: request`, a `terminal:` line with six lowercase letters and digits (kept in `$T`) and the H1 `Add refunds after pickup`; `cat $D/announcements/.gitignore` prints `*` | ☐ |
| 5 | `TRAMA_TERMINAL=$T j proposal new "Refunds after pickup"`; note the ID it prints, `<P>` | No note in the output. The same ghost (no second one) now reads title `Refunds after pickup` and the line `Writing` | ☐ |
| 6 | `j proposal submit <P>` | The ghost disappears and the real card of that Proposal stands in its place; the count and the badge go up by one; no notice appears | ☐ |
| 7 | `A=$(TRAMA_TERMINAL=$T j announcement new --input - <<<'{"kind":"task","title":"Refund prepared orders"}')` | A ghost of kind `Task` and line `Preparing` stands at the bottom of Active, after the real cards and before **Run all**, with the count of Active unchanged | ☐ |
| 8 | `j task new "Refund prepared orders" --ref order/Refunding --announcement $A` | The ghost gives way to the real card, at the same place; `ls -A $D/announcements` shows only `.gitignore` | ☐ |
| 9 | `TRAMA_TERMINAL=zz99zz j announcement new --input - <<<'{"kind":"drift","title":"Cart differs"}'` | A `Drift` ghost stands at the bottom of Backlog, after the last real card. It belongs to another terminal (`terminal: zz99zz` in its file) | ☐ |
| 10 | `j task new "Unannounced" --ref order --announcement zzzzzz` | The Task is created and the output adds `No announcement "zzzzzz" was found …`; no ghost appears or is left | ☐ |
| 11 | `TRAMA_TERMINAL=$T j announcement new --input - <<<'{"kind":"task","title":"Left behind"}'`, then in the **Design** terminal press Ctrl+C | The `Task` ghost disappears at once. At the top of the Board one notice, `The agent finished without delivering Task Left behind.`, with a **Close** button. The `Drift` ghost of row 9 stays: it belongs to another terminal | ☐ |
| 12 | Click **Close** on the notice, switch to the Diagram tab and back | The notice is gone; closing the Trama tab and opening it again shows none | ☐ |
| 13 | `TRAMA_TERMINAL=$T j proposal new "Never finished"`, read the ghost, then `j proposal discard <ID it printed>` | A `Writing` ghost titled `Never finished`; after the discard it disappears and **no** notice is shown | ☐ |
| 14 | `TRAMA_TERMINAL=$T j announcement new --input - <<<'{"kind":"task","title":"Before reload"}'`, then Developer: Reload Window and open the Board | The ghost is not there and no notice is shown: leftovers are withdrawn at startup | ☐ |
| 15 | **Add Work Item…**, type any text and close the tab | The instruction goes to omp (a terminal, or an omp Chat conversation) and the ghost of the request appears | ☐ |
| 16 | `j announcement new --input - <<<'{"kind":"task","title":"Outside"}'`, then `j proposal new "Outside"` | The first command is refused with an error saying that only an agent started by Trama can announce, and writes nothing; the second creates the Proposal without a ghost and without an error | ☐ |
| 17 | 🪙 With a real agent (section I) ask for a design that needs questions | While its question round is open every ghost reads `Waiting for your answers`; they go back to `Preparing` or `Writing` when the round closes | ☐ |
| 18 | Restore S2. ↻, then `j task move 1 doing` | The card moves to In progress without ever looking busy; no dashed copy of it appears in In progress at any moment | ☐ |
| 19 | `C=$(TRAMA_TERMINAL=$T j announcement new --input - <<<'{"kind":"check","title":"Final check after all Tasks","phase":"verifying"}')` | La Board non mostra nessun ghost per il controllo (non ha una colonna: sta nella barra di stato); nessun numero cambia | ☐ |
| 20 | `j announcement move $C scanning`, poi di nuovo lo stesso comando | Il ghost passa a `Scanning`; il secondo comando dice che il controllo è già in Scanning | ☐ |
| 21 | `j announcement move $C delivered` | Il ghost sparisce e **nessun** avviso compare | ☐ |

### E13. Collapse the Done column
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Open the Board the first time after opening the panel | The Done column is collapsed: a narrow strip with a `chevron-left` icon button (accessible name `Expand Done column`, not expanded) and the title `Done` read top to bottom; no cards, no count, no `Clear`; Backlog and Active share the freed space | ☐ |
| 2 | Activate the button | The column opens with its count, the Done cards grouped by day and `Clear` at the foot; the button shows a `chevron-right` icon, reads `Collapse Done column` and reports expanded; focus stays on the button | ☐ |
| 3 | Collapse it again, then edit a Task file so the Board refreshes | The column stays collapsed after the refresh | ☐ |
| 4 | Close the Trama panel and open it again | The column starts collapsed again | ☐ |

---

## F. Live updates and errors

| # | Action | Expected | ✓ |
|---|---|---|---|
| F1 | ↻. Open `tasks/0004-upgrade-dependencies.md` in any editor, change `column: done` to `column: todo`, save | Within about a second, Task 0004 moves to Ready (Ready now has 3 cards, Done is empty and shows its empty hint). No reload. The Board badge stays `4` | ☐ |
| F2 | In the same file change `refs: []` to `refs: text`, save | A red banner appears at the top of the panel, above the view, naming `…/tasks/0004-upgrade-dependencies.md` and saying `"refs" must be a list of strings`. The board and diagram keep showing the last good data | ☐ |
| F3 | Change it back to `refs: []`, save | The banner disappears by itself | ☐ |
| F4 | ↻. In the verification shell run `echo >> $D/model/checkout/order.md` | Proposal 0001 gets the badge `stale`; **Approve** (Board and Diagram) is disabled. `j proposal list` prints `0001 [open, stale]` | ☐ |
| F5 | ↻. Add a new file with `printf '%s\n' '---' 'column: todo' 'technical: true' 'refs: []' 'drift: null' '---' '# Rebuild CI cache' > $D/tasks/0005-rebuild-ci-cache.md` | A new Task `0005` appears in To do within a second with the badge `technical`; counts update | ☐ |
| F6 | Delete that file | The card disappears | ☐ |
| F7 | Trigger any error banner (F2) and click the `×` | The banner hides | ☐ |
| F8 | ↻. In `model/checkout/order.md` remove the text ` (initial)` from `### Draft (initial)`, save 🔍 | No crash. The UI does **not** warn that the Model is invalid (no code shows Model errors). Note what you see. Run `j model check`: exit 1 with `The Machine must have exactly one (initial) State, found 0` | ☐ |
| F9 | ↻. Edit `proposals/0001-*/proposal.md`, change `status: open` to `status: bogus`, save | Red banner naming that file with `"status" must be one of open, approved, rejected` | ☐ |
| F10 | With the Trama tab hidden behind another tab, edit a Task file, then return to the Trama tab | The change is already shown | ☐ |

---

## G. Developer decisions (agent mode: omp, S2)

For every G test, ↻ first, then open the panel and the terminal panel.

### G1. Approve a Proposal from the Board
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | Board: **Approve** on Proposal 0001 | The card leaves Work Items (count 3). No error banner | ☐ |
| 2 | Look at the bottom panel | A terminal named **Scan** opens in the project folder | ☐ |
| 3 | Read the terminal | Exactly **one** command was sent and one line printed: ``Use the trama-scan skill on what Proposal 0001 changed: its scan scope is in `trama proposal show 0001`. Link every Task you file to it with --proposal 0001.``, senza nulla su trama-implement | ☐ |
| 4 | Verification shell: `j model check` | `The Model and its Requirements are valid.` | ☐ |
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
| 2 | Type `Split it by state`, press Enter | The card leaves Work Items. No terminal is opened | ☐ |
| 3 | `grep status $D/proposals/0001-*/proposal.md` | `status: rejected` | ☐ |
| 4 | `tail -4 $D/proposals/0001-*/proposal.md` | A `## Feedback` heading followed by `Split it by state` | ☐ |
| 5 | `j model check` | The Model is unchanged and valid (order.md has no `Returned`) | ☐ |

### G3b. Reject without feedback
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | ↻. Board: **Reject** on Proposal 0001, press Enter with the box empty | The box accepts it. The card leaves Work Items. No terminal is opened | ☐ |
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
| 1 | ↻. Board: **Keep this** under **WHAT HAPPENS** on Drift 0002 | Both Drift 0002 and Proposal 0002 leave Work Items (count 2) | ☐ |
| 2 | Read the terminal | No terminal opens and no agent starts: approving a Proposal launches no scan | ☐ |
| 3 | `grep -n 'Written off' $D/model/checkout/payment.md` | A line `### Written off (final)` | ☐ |
| 4 | `sed -n 1,8p $D/drifts/0002-*.md` | `status: resolved`, `resolution: proposal`, `proposal: "0002"` | ☐ |
| 5 | `grep status $D/proposals/0002-*/proposal.md` | `status: approved` | ☐ |

### G6. Fix the code (Drift → Task)
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | ↻. Board: in Drift 0001 select **Refund only after the return**, type `Keep the audit log` in the note and click **Keep this** under **WHAT SHOULD HAPPEN** | Drift 0001 leaves Work Items (count 3) | ☐ |
| 2 | Look at Ready | A new card `0005` `Fix code to match the Model: Code refunds after the package is picked up`, chip `order/Shipped`, text `from Drift 0001` | ☐ |
| 3 | `ls $D/tasks` | Includes `0005-fix-code-to-match-the-model-code-refunds.md` | ☐ |
| 4 | `sed -n 1,8p $D/tasks/0005-*.md` | `column: todo`, `technical: false`, refs `order/Shipped`, `drift: "0001"` | ☐ |
| 5 | `sed -n 1,10p $D/drifts/0001-*.md` | `status: resolved`, `resolution: fix-code`, `task: "0005"`, `option: 2`, `note: Keep the audit log` | ☐ |
| 5b | `cat $D/tasks/0005-*.md` | The body holds, in this order, `## What happens`, `## What should happen`, `## Chosen option` (**Refund only after the return** with its text), `## Note` (`Keep the audit log`) and `## Where in the code` | ☐ |
| 5c | `j drift show 1` | After the two sides, `## Fix options` as a numbered list (`1. **Refuse the refund** (recommended)`, `2. …`), the Where in the code, then `## Chosen option` `2. Refund only after the return` and `## Note` | ☐ |
| 6 | Terminal | Nothing was launched | ☐ |

### G6b. Fix options on the command line
Seed a Drift: `j drift new --input '{"title":"Cli fix","refs":["order"],"happens":"The code does it.","should":"The Model says so.","where":"src/cli.ts","options":[{"title":"Change it","text":"Make the code do it."},{"title":"Drop it","text":"Remove the behaviour."}]}'` (its ID below is `<id>`).
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | `j drift new --input '{"title":"Few","refs":["order"],"happens":"a","should":"b","where":"w","options":[{"title":"Only","text":"one"}]}'`, then the same with the options `[{"title":"A","text":"a"},{"title":"B"}]` (no text), then with two options titled `A` | Each is refused, naming the problem (from 2 to 5 options; option 2 needs its text; two options titled `A`); no Drift is created | ☐ |
| 2 | `j drift move <id> code-to-be-fixed` with the input not a terminal (for example `j drift move <id> code-to-be-fixed < /dev/null`) | Refused: `An option must be chosen …`; the Drift stays open | ☐ |
| 3 | `j drift move <id> code-to-be-fixed --input '{"option":9}'`, then `j drift move <id> proposal-accepted --input '{"option":1}'` and `j drift move <id> dismissed --input '{"note":"x"}'` | The first is refused (an option must be chosen, from 1 to 2); the others are refused (an option or a note only goes with fixing the code); the Drift stays open | ☐ |
| 4 | 🔍 In a real terminal: `j drift move <id> code-to-be-fixed` | A numbered menu of the options with `(recommended)` on the first and the prompt `Option [1]:`; typing `9` asks again; pressing Enter takes option 1; then `Note (optional, Enter for none):`. Typing a note and Enter resolves the Drift | ☐ |
| 5 | `j drift show <id>` | `## Chosen option` `1. Change it` and the note, if you typed one | ☐ |

### G7. Keep what happens with no Proposal
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | ↻. Board: **Keep this** under **WHAT HAPPENS** on Drift 0001 | The card disappears; the Tasks do not change (still 4 files in `$D/tasks`) | ☐ |
| 2 | `sed -n 1,8p $D/drifts/0001-*.md` | `status: resolved`, `resolution: dismissed`, `task: null` | ☐ |
| 3 | `j drift move 2 dismissed` (Drift 0002 has Proposal 0002 attached) | Refused: the Drift has an attached Proposal; accept it or fix the code | ☐ |

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
| 2 | Click **Rework Proposal** | The terminal prints one line: `Use the trama-design skill, without asking questions. Proposal 0002, attached to Drift 0002, is stale: write a new Proposal that makes the same change on the current Model and Requirements, attach it to the Drift in place of the stale one as soon as you create it, then hand it over.` | ☐ |
| 4 | On a Drift whose Proposal is still a Draft, click the left **Keep this** | A warning `… is still being written. Wait until the agent hands it over.` | ☐ |

### G9. Technical Tasks
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | The Board has no **New technical task** button | Technical Tasks are filed by the agent (`trama task new --technical`) | ☐ |

### G10. Stale approval is refused
| # | Action | Expected | ✓ |
|---|---|---|---|
| 1 | ↻. `echo >> $D/model/checkout/order.md`, then try **Approve** on 0001 (it is disabled; use `j proposal approve 1` to see the CLI refusal) | CLI: `error: Proposal 0001 is stale: the Model changed since it touched checkout/order.md. Write a new Proposal.`, exit 1. In the UI the button is disabled | ☐ |

---

## H. Launching the agent (S2)

Each launch starts a new agent terminal named after its work (cwd = the demo folder): `Scan` for scans, `Design` for design requests, `Setup` for the request that starts a project from scratch, the Task's short number (for example `T1`) for **Run**, `All tasks` for **Run all**. Inspect the command in the terminal list; Trama does not reuse terminals or show the terminal area automatically. The panel, cursor and keyboard stay where they were.

| # | Action | Expected in the terminal | ✓ |
|---|---|---|---|
| H1 | Side menu: **Scan System**, then **Scan** in the confirmation | `Use the trama-scan skill on the whole System.` | ☐ |
| H5 | Board toolbar | Only **Scan System** is there, with no **Quick request…**, no **Add Work Item…** and no input box. No line with `Use the trama-design skill.` is ever printed by a Board button | ☐ |
| H6 | Diagram toolbar and Requirements toolbar | Neither has **Quick request…** nor **+ Add Work Item**; the Requirements toolbar shows only the Proposal selector and the filter. **+ Add Work Item** is in the Board's Work Items column only | ☐ |
| H10 | Board, Task 0001: **Run** | `Use the trama-implement skill on Task 0001.` | ☐ |
| H11 | Board: **Run all** | ``Use the trama-implement skill on every Task in the "todo" column. Take them from `trama task list --input '{"runnable":true,"max":{maxParallelAgents}}'`, one group at a time, until it says there is none.`` | ☐ |
| H12 | Do E11.13 (the two Drifts of E11 and Task 0002 In progress), take Tasks 0005 and 0007 back with `j task move 5 doing` and `j task move 7 doing`, then look at **Run all** and at the Task card `0006`, tagged `Proposal 0003` | **Run all** is **disabled** with the tooltip and accessible description `All the Ready Tasks are blocked: Task 0001 is blocked by Drift 0006`; Task `0006` shows its tag `Proposal 0003` and the badge `blocked 0003`. Before taking the Tasks back the tooltips are `An agent is working on Tasks 0005, 0007` and `An agent is working on Task 0007`: the agent working comes first. `j task move 2 todo` enables **Run all** | ☐ |
| H13 | Side menu: **Scan System**, then **Scan** in the confirmation | Only one scan can be launched: the whole System, `Use the trama-scan skill on the whole System.`. No command **Trama: Scan System** exists, and no scan of a single Feature is launched by Trama | ☐ |
| H15 | Palette: type `Trama`, look at the list | No **Quick Design Request…** and no **Add Work Item…** command: design requests start only from the Board's **+ Add Work Item** button (and, with an empty Model, the Diagram's **Import from Code** and **Start from Scratch**) | ☐ |
| H15a | Board: click the arrow beside **+ Add Work Item** | The menu has only **Unify Drifts**; no **Add Quick Task** item is shown | ☐ |
| H16 | After H1 to H15, open the terminal dropdown | Every launch has its own terminal, even when an earlier command with the same name has ended. Terminals are named for their work: `Scan`, `Design`, a Task's short number or `All tasks`; no terminal is reused | ☐ |
| H20 | Set `"trama.ompPath": "/tmp/fake/omp"` (a script that writes its arguments to a file) in user settings; click **Scan System** | The terminal command starts with `'/tmp/fake/omp' --hook '<extension>/…/omp-hook.js'` and ends with the instruction; with `trama.ompPath` empty or only spaces it starts with the quoted path of the first `omp` found in the PATH, `~/.bun/bin` or `~/.local/bin` | ☐ |
| H20a | With no `omp` in the PATH, `~/.bun/bin` or `~/.local/bin` and `trama.ompPath` empty, click **Scan System**, and **Ask more** on a card | Nothing starts: no terminal, no conversation, no ghost, no job. Each time a warning (not modal) `Trama: omp is not installed. Trama runs every agent with omp.` with the buttons `Install omp` (opens the terminal `Install omp`) and `Open Settings` (opens the panel on the Settings tab, also when it was closed). The work does not restart by itself | ☐ |
| H20b | With a fake `omp` whose `update --check` prints `Current version: 1.0.0` and `New version available: 1.1.0`, set as `trama.ompPath`, click **Scan System** | A notification without cancel `Updating omp to 1.1.0…` stays while `omp update` runs and the terminal opens after it; a second launch within the hour runs neither command | ☐ |
| H20c | With a fake `omp` whose `update --check` exits with code 4 (or prints nothing known), click **Scan System** twice | The launch goes on with that omp, and a single information message `Trama: could not update omp (omp update --check exited with code 4). The agent runs with omp the installed version.` shows; changing `trama.ompPath` and launching again checks again | ☐ |
| H20d | Cut the network (or make `omp update --check` hang) and click **Scan System** | After 30 s the launch goes on with the omp of before and the message says `omp update --check did not answer within 30 s` | ☐ |
| H20e | With a fake `omp` whose `--version` prints `18.12.5` (and whose `update --check` says it is up to date), set as `trama.ompPath`, click **Scan System** and **Ask more** on a card; then look at the `omp` step of the wizard, the omp row of the Settings tab and General | Nothing starts and the warning says `Trama needs omp 18.12.6 or later; the installed omp is 18.12.5.` with `Install omp` and `Open Settings`; the wizard step and the Settings row show the same sentence in place of the version, with `Install omp`; General shows it as its error line, with `Install omp` and no warning in the editor | ☐ |
| H21 | Set `"trama.language": " Italian "` in user settings; click **Scan System** | The instruction includes `Write everything you generate in Italian, except code, which always stays in English.`; the setting applies to scans, Runs, written design and imports | ☐ |
| H22 | Change `trama.language` to `"   "`; click **Scan System** | The instruction has no language sentence | ☐ |
| H23 | Restore S2 and remove `trama.language` | The setup is restored | ☐ |
| H23a | Remove `trama.language` from user settings (keeping the rest), reload the window; then open a fresh profile with no `trama.language` and `LANG=it_IT.UTF-8`, start the extension | The user setting stays empty (Trama does not save the system language); the instruction carries no language sentence | ☐ |

### H32–H50. Written design requests

With the real agent from S2, in the verification shell, `ls -A $D/requests` lists the requests. A request ID is the local date and time it was created, like `2026-10-04T19-05-12`.

| # | Action | Expected | ✓ |
|---|---|---|---|
| H32 | Board: **Add Work Item…** | A new tab `<id>.md`, language Markdown, not in preview (title not italic), completely empty. Its editor title has a **Send to agent** button with the send icon and the tooltip `Send to agent (closing the tab sends it too)` | ☐ |
| H32a | On the empty tab from **Add Work Item…**, look at the start of the first line | The grey text `Describe the change to design: behaviour, edge cases, requirements. Paste or drop images for context. Close this tab or press Send to agent when you are done.` is shown on one line; the file stays empty | ☐ |
| H32b | Type one letter, then delete it; type a space on the empty tab and delete it again | The grey text disappears at the first letter and comes back when everything is deleted; with only a space it stays away | ☐ |
| H33 | `ls -A $D/requests` and `cat $D/requests/.gitignore` | `.gitignore` and the empty `<id>.md` already exist; the `.gitignore` prints `*`. `git status` in the demo shows nothing under `.trama/requests/` | ☐ |
| H34 | Switch to any other file tab, then back | **Send to agent** is shown only on the request's tab | ☐ |
| H35 | On the empty tab, type only spaces and blank lines, then **Send to agent** | Warning `Trama: write the design request before sending it.`; nothing is printed in the terminal and the tab stays open | ☐ |
| H36 | With `files.autoSave` set to `off`, type five lines: a code fence (three backticks), `# Not a title`, a closing code fence, `# Returns after shipping`, `Customers may send an order back.`; wait a second | The tab never stays marked as unsaved for more than a moment; `cat $D/requests/<id>.md` prints exactly the text typed | ☐ |
| H37 | **Send to agent** | The tab closes without asking to save. The terminal prints ``Use the trama-design skill on the design request in `.trama/requests/<id>.md`. Bind the first Proposal you open to it with `--request <id>`.`` A ghost titled `Returns after shipping` appears in To decide. No other message | ☐ |
| H38 | Reopen `<id>.md` from the Explorer, add a line, wait, then close the tab. Reopen it, delete all its text, wait and close it again | No **Send to agent** button; the line is saved by itself. Closing prints nothing, even when empty, and the file stays | ☐ |
| H38a | Reopen the H37 request from the Explorer, delete all its text, wait | No grey ghost text on the tab; the file stays empty and is not sent again | ☐ |
| H39 | Board: **Add Work Item…**, type `Cancel orders`, wait, close the tab | Closing sends it: the same instruction for the new ID is printed and a ghost `Cancel orders` appears. Reopened from the Explorer, the file has no **Send to agent** | ☐ |
| H40 | **Add Work Item…**, then close the empty tab at once | No message, nothing printed; the new file is gone from `$D/requests` | ☐ |
| H41 | Set `printf '{}\n' > /tmp/trama-demo/shop/.vscode/settings.json` (no agent command), ↻. **Add Work Item…**, type `Refunds`, **Send to agent**, and press Esc in the `Trama: agent command` box | Nothing is printed; the tab stays open with **Send to agent** | ☐ |
| H42 | Close the tab and press Esc again in the box | The tab is closed and nothing is printed; the file stays. Reopened from the Explorer it has **Send to agent**. Restore S2 | ☐ |
| H43 | Run **Developer: Reload Window** with the H42 request open | Nothing is printed. After the reload the tab is back with **Send to agent**; the H37 request, reopened, still has none | ☐ |
| H44 | **Send to agent** on the H42 request, then reopen it and close it | One instruction is printed for the send, none for the close | ☐ |
| H45 | `j proposal new "Lost" --request 2026-01-01T00-00-00` | `Created Draft Proposal …` followed by `Design request 2026-01-01T00-00-00 was not found; the Proposal is not bound to any request.` The Proposal file has no `request` line | ☐ |
| H46 | Reopen the H37 request. `j proposal new "Returns" --request <id>`; note `<P>`. In `proposal.md`, look at the front matter | `request: <id>` | ☐ |
| H47 | Make `<P>` invalid (`j proposal edit <P> checkout/order.md`, point a Transition at a missing State) and `j proposal submit <P>` | Refused; `$D/requests/<id>.md` still exists and its tab is still open | ☐ |
| H48 | Fix the file and `j proposal submit <P>` again | Output `Submitted Proposal <P> for review` and `Deleted design request <id>: it is now consumed.`; the file is gone and its tab closes. `request: <id>` stays in `proposal.md` | ☐ |
| H49 | Reopen the H39 request (its ID is `<id2>`), `chmod a-w $D/requests/<id2>.md`, add a line (the editor cannot save it), then `rm $D/requests/<id2>.md`. Then **Add Work Item…**, type `Gone`, wait and `rm` that file | The first tab stays open, marked as deleted, with the unsaved change, and the file is not written back. The second tab closes; nothing is printed for either | ☐ |
| H50 | With the Trama panel closed, repeat the second half of H49 | The tab still closes | ☐ |


### H71–H77. Agent terminal as an editor tab

Set `trama.terminalLocation="editor"` in **user** settings for S2t. For S2u use a real omp agent that remains active; set `trama.autoExit=false` in user settings. Open the Trama panel alone in one editor group before each row.

| # | Action | Expected | ✓ |
|---|---|---|---|
| H71 | Set S2t, reload, click in the panel's search box (or any editor), then Board: **Scan System** | A `Scan` terminal tab opens in a new editor group beside the panel; it does **not** take focus, the panel stays visible, and the terminal area gets no `Scan` terminal. `echo $TRAMA_AGENT` in the tab prints `1` | ☐ |
| H72 | Click on the panel, then **Scan System** again | A new tab titled `Scan` opens in the same group without taking focus | ☐ |
| H73 | With S2u, repeat **Scan System** while the first command runs | A second `Scan` tab opens in the same group; each terminal's end is followed independently, releasing its Tasks and withdrawing undelivered announcements with local notices. After both end, **Run all** opens an `All tasks` tab in the same group | ☐ |
| H74 | With S2u, close every agent tab and the group of H73, click **Scan System**, then close the group of the new tab while it runs and click **Scan System** again | Each time a new group opens beside the active one, since the previous tab's group is gone | ☐ |
| H75 | With S2u, **Add Work Item…** `Tabbed request`, sent, then close the tab while the command runs | The `Tabbed request` ghost appears at once and is withdrawn when the tab closes, as when the integrated terminal closes; the next **Scan System** opens a new tab beside the active group | ☐ |
| H76 | Drag the `Scan` tab of H71 into another group, then click **Scan System** twice with S2u | The second new tab opens in the group where Trama had opened the first one, not where you dragged it: Trama does not follow a moved tab | ☐ |
| H77 | Set `trama.terminalLocation="panel"` in user settings, reload, close the terminal area, click in the panel's search box, then **Scan System** | A `Scan` terminal is created in the terminal area but not shown; the area stays closed, focus stays in the search box, and `Scan` appears in the terminal list | ☐ |

After H71–H77, restore S2.

---

## I. Real agent: omp 🪙

Trama runs omp, found in `trama.ompPath` or the editor's PATH; there is no agent to choose. Stop an agent at any time with Ctrl+C. Quit omp between launches (I7).

| # | Action | Expected | ✓ |
|---|---|---|---|
| I1 | With omp installed, reload, ↻, then Board: **Scan System** | The terminal shows `omp 'Use the trama-scan skill on the whole System.'` and omp starts and starts working on the prompt. `dist/` of this repo must be on the PATH the editor gives its terminals, or omp cannot run `trama`. If it fails for you, copy the exact text the terminal shows | ☐ |
| I2 | In omp type `/skill:trama-scan` (or ask which skills are loaded) | The skill `trama-scan` is known. If not, omp does not read `.agents/skills/` of the project: report it | ☐ |
| I3 | Interrupt omp and ask it to run `command -v trama` | `/home/luca/Developer/Trama/dist/trama` | ☐ |
| I4 | Ask it to run `trama project show` | The same board as S5 | ☐ |
| I5 | Let the scan finish. In the verification shell: `j project show` | Tasks 0005 to 0008 were created (about four, one per Machine or group of States; the demo has no code, so everything not covered by Tasks 0001 to 0004 is missing) and **no Drift**. **Proposals 0001 and 0002 are still open**: the agent must not have run `proposal approve`, `proposal reject` or `drift move`. `j model check` is still valid and `.trama/model/` is unchanged. Ran against a real omp: passed | ☐ |
| I6 | While the scan runs watch the board | The new Tasks appear in To do by themselves while the agent works (seen: 2 to 5 cards after about 27 s, 6 after 33 s). Ran against a real omp: passed | ☐ |
| I7 | While omp is still running in the terminal, click **Scan System** again | A **new** terminal named `Scan` opens and runs the command there; the running omp receives nothing. (Before this was fixed the command line was typed into omp as a message.) Once every command has finished, the next launch with the same name reuses the last terminal instead of opening another. Reproduced the old bug twice and verified the fix with a slow command; not yet repeated with omp itself | ☐ |
| I8 | Quit omp. **Add Work Item…** with `Orders can also be returned`, sent | omp reads the `trama-design` skill and explores the Model. Because Proposal 0001 already covers part of this, it asks you with a menu (options such as replacing or extending 0001) and **waits for your answer**. Pick an option; omp then writes a Proposal that appears in To decide as soon as the file exists, with its changes listed. Ran against a real omp as far as the question; the answer and the new Proposal still need a human | ☐ |
| I9 | ↻ (Task 0002 must be in To do: **Run** only exists on To do cards). Quit omp, then Board: **Run** on Task 0002 | The terminal shows `… omp 'Use the trama-implement skill on Task 0002.'`. omp reads the Task (`trama task show 0002`) and moves it to In progress. The demo has no code and no stack, so it asks you what to build with and, if you do not answer, puts the Task back in To do. Nothing is written in `.trama/model/`. Ran against a real omp: passed up to that point | ☐ |

---

## J. Empty project

Setup: `mkdir -p /tmp/trama-empty && code --extensionDevelopmentPath=/home/luca/Developer/Trama/extension --new-window /tmp/trama-empty`

| # | Action | Expected | ✓ |
|---|---|---|---|
| J1 | **Trama: Open** in a folder without `.trama/` | The panel opens on Get Started, which is the setup wizard, in a single column centred and at most about 720 px wide: the page title `Set up Trama`; the step indicator (a `Setup steps` navigation: numbered circles with `Path`, `omp`, `Models`, `Project`, `Advanced`, `Summary` and a thin line between them, the current circle filled in the primary colour with its name in bold, the next ones dimmed); the title `Path` with `Choose how Trama starts in this folder.`; under it the Trama notice about the `.trama` folder; then two cards side by side, **Import from Code** (folder-code icon) and **Start from Scratch** (sparkles icon), each with an empty radio circle at the top right (none chosen). In a bar fixed at the bottom, with the panel's background and a thin top border, a disabled **Next** whose tooltip says `Choose how to start`. No **Back** and no **Cancel**. The notice shows only on `Path` and `Summary` | ☐ |
| J1a | Choose **Import from Code**, then **Start from Scratch**; hover the cards | The chosen card has the primary border, a light primary tint and a filled radio circle; hovering a card changes only its border colour, never its background. The indicator gains the step `Folders` with Import from Code and loses it with Start from Scratch. **Next** becomes available. The arrows move the choice. Under about 560 px the cards go one under the other. Switching to another tab (Settings) and back keeps the choice | ☐ |
| J1b | In a folder that has a visible file, choose **Start from Scratch** | Under the choices, in the warning colour with a triangle icon: `This folder already contains files. Start from Scratch ignores them unless your request mentions them; Import from Code describes them instead.` No dialog. Choosing **Import from Code** removes it; a folder with only `.git` or `.vscode` never shows it | ☐ |
| J1c | In a workspace with several folders, look at `Path` | A select titled `Folder to initialize as a Trama project` with one entry per folder, the first chosen. Changing it after unchecking folders in `Folders` forgets the unchecked ones | ☐ |
| J1d | Press **Next** to `omp`, then set `Omp Path` to a path that does not exist | The focus is on the title `omp` and the page is at the top. Under the sentence, before the settings, a bordered box (a polite status): `Checking omp…` with a spinning icon (still with `prefers-reduced-motion`), then, in the warning colour with a triangle icon, `omp not found at <path>. Trama cannot work without omp.` with **Install omp** inside the box (the other reasons: `omp models did not answer within 15 s`, `omp exited with code <N>`, `omp models did not return a valid list`, each followed by ` Trama cannot work without omp.` with a single full stop between the two); with omp installed, a check icon in the success colour and `omp <version> answered with <N> models.`. **Next** is disabled with the tooltip `omp must answer before you go on.` until omp answers. Each setting shows its bold title, its explanation in secondary text, then its control, one under the other with the same space between them, and no «i» nor bubble; an enum shows under its `Select` the description of the chosen value, which changes with the value. `Omp Path`, `Terminal Location` and `Ignore Instruction Files` are always shown | ☐ |
| J1d2 | On the `omp` step with omp answering, look under the status box; press **Log in** on a provider, finish or close its terminal, and change `Omp Path` to an omp that is not saved yet and press **Log in** again | The **Providers** section of the Settings tab (same texts, rows and states) is under the status box and before the settings; it is absent while the first check runs and when omp does not answer, and keeps its rows while omp is checked again. **Log in** opens a terminal `Log in to <name>` running the omp of the step's path, saved or not; when its command ends or it closes, the step checks omp again (no notice), updates **Connected** and the number of models, and keeps every choice of the wizard | ☐ |
| J1d3 | On the `omp` step with an omp that answers but lists no usable model (no login, no API key), hover **Next**; then log in to a provider | **Next** is disabled and its tooltip and description say `omp has no models yet. Log in to a provider or set an API key.` (with omp missing, not answering or being checked: `omp must answer before you go on.`). When the check after the login lists at least one model, of any provider, **Next** enables on its own; a failed omp update with models does not block it | ☐ |
| J1e | On `Models`, with `omp` chosen but not saved, open the field `Scan` | Under the title of each role, in bold and before the explanation: `Your most capable model.` (`Analysis`), `A mid-range model.` (`Execution`), `A fast, light model.` (`Scan`). The suggestions are the models of omp, not of the saved agent, in a list as wide as the field. The field takes the whole row, with the thinking level `Select` at its right when omp declares levels. Type `0` in `Max Parallel Agents`: the message shows under the field and **Next** is disabled with a tooltip; `3` enables it | ☐ |
| J1f | Press **Next** to `Project` | The title `Project`, the field `Skills Dir`; when the workspace settings set it, the notice that the workspace setting overrides it | ☐ |
| J1g | With **Import from Code**, press **Next** to `Folders` | A tree of the first level of the folder (folders first), with a box and a folder or file icon per entry (an open folder shows the open icon), no names that start with a dot and, in a git repository, nothing that `.gitignore` ignores; `Everything is included`. Folders start closed; the chevron or the right arrow opens one, and each level is indented about 16 px (about 10 px under 480 px). A name that does not fit is cut with an ellipsis and shows whole in its tooltip. The tree scrolls inside the step, never the page, and stays above the bar of buttons. Uncheck a folder: `1 excluded`; uncheck one entry inside another folder: that folder shows the mixed box. With the arrows and Space the tree works from the keyboard. Uncheck every entry: **Next** is disabled with `Include at least one folder or file` | ☐ |
| J1h | Press **Next** to `Advanced`, look at the settings, change `Theme`, then press **Skip** | Four subgroups with their subtitles, in order: `Appearance`, `Drifts`, `Agents`, `omp Chat`. Each checkbox is left of its title, with its explanation under it aligned to the title; clicking the title changes it. **Skip** (not primary) stands left of **Next**. The `Summary` opens and `Theme` shows its initial value, with no `changed` badge. **Back** returns to `Advanced` with the values the step had before the skip | ☐ |
| J1i | On `Summary`, look at the cards | The notice of Get Started is under the sentence, above the cards. One card per step, in the order of the steps, with the step title and, at its right, a secondary button **Edit** (pencil icon, name `Edit <step>`, tooltip `Go back to <step>`) that returns to the step. Inside, one row per setting, the title on the left and the value on the right (the value under the title under 480 px); `Advanced` has its four subtitles. Values: monospace for text and numbers, the entry for an enum, `On`/`Off` for checkboxes, `(default)` after a default value, `(empty)` in secondary text for an empty text. A long value wraps, preferably after `/`, `-`, `_` or `.`, and never leaves its card. A row that changes the setting has a light primary tint, the badge `changed` and, after the value, `was <value>`. `Folders` shows the excluded paths separated by commas or `None`. The confirm button reads **Set up Trama** | ☐ |
| J1j | From `Summary`, click `Go back to Path` in the indicator, change the path and go forward with **Next** each time | Every circle before the current step shows a check in the primary colour and is a button with the tooltip and name `Go back to <step>`; the current step and the next ones are not buttons and Tab skips them. Going back several steps at once keeps every choice made (path, settings, unchecked folders); the focus lands on the new title and the page is at the top. The next steps are reached only with **Next**, which checks each of them | ☐ |
| J1k | Narrow the panel under about 480 px, then under about 300 px, in the light and the dark theme, in the three modes | The indicator becomes `Step <n> of <N> · <step>` with a progress bar filled for n/N, and **Back** returns to the previous step. The page never scrolls sideways; long texts wrap and a long value scrolls inside its field; no element overlaps or is cut by another. The bar of buttons stays at the bottom while the step scrolls, and the last element of every step can be scrolled above it. When the buttons do not fit on one row, **Next** (or the confirmation) goes on its own row, full width, under the others | ☐ |
| J2 | Press **Set up Trama** after changing two settings, in a workspace folder with a customised skill file, and cancel the modal | The modal `Trama did not initialize this project.` lists the file; Esc/Cancel shows no message, nothing is created and no agent starts. The wizard stays on the summary; the two settings are saved in the user settings, and a second confirmation writes only the ones still different | ☐ |
| J3 | Choose **Start from Scratch** in the empty folder and press **Set up Trama** | Only the changed settings are written (Settings: User); `.trama/model/system.md` and `.agents/skills/trama-{design,scan,implement}/SKILL.md` (or the folder chosen in `Project`) appear; the panel shows the project and an empty design request opens in a tab | ☐ |
| J3a | On the tab that Start from Scratch opened, look at the start of the first line | The grey text `Describe the application to build: what it does and who it is for. Paste or drop images for context. Close this tab or press Send to agent when you are done.` is shown on one line; typing a letter removes it | ☐ |
| J4 | Look at the Diagram 🔍 | Breadcrumb `System`. At the top of the Diagram, the empty-Model text `The Model is empty. Import the existing code or start from scratch; later, design changes from the Board.`, with **Board** as a link, and below it two buttons side by side, **Import from Code** and **Start from Scratch**, in the style of the panel's buttons. Tooltips: `Open the guided setup to describe the existing code as Proposals` and `Open the guided setup to describe the project you want to build`. Board shows 0 in all columns and the side menu's Board entry shows no number | ☐ |
| J4a | Click **Board** in the empty-Model text, then back on the Diagram click **Import from Code** | The Board view opens. The panel moves to the Settings view, which shows the wizard in the Empty Model mode: the steps `omp`, `Models`, `Project`, `Folders`, `Advanced`, `Summary` (no `Path`), **Cancel** at the far left before **Back**, and nothing initialized or sent yet. On the summary the button reads **Save and import**; confirming saves the changed settings, the panel goes to the Board and the agent gets `Use the trama-import skill on this repository.` followed by the sentence with the excluded paths (or `Import every folder and do not ask which folders to import.`); the agent does not ask which folders to import. **Cancel** returns to the Board with nothing saved. Once a Feature or Actor exists, the text and both buttons disappear | ☐ |
| J4b | In the folder of J3 (it has `.trama/` and an empty Model), put a visible file in it, open the Diagram, click **Start from Scratch** and confirm with **Save and start** | No warning about the visible file and nothing is initialized: the setup request opens in a tab at once, and `.trama/` is unchanged | ☐ |
| J4c | In a project with an empty Model run **Trama: Import from Code**, also with the panel closed; then in a project with a Model run it again | With the empty Model the panel opens in front on the Settings view, with the wizard in the Empty Model mode and Import from Code chosen. Running the command again, or pressing **Import from Code** on the Diagram, while that wizard is open keeps it as it is; pressing **Start from Scratch** starts it over on that path. With a Model nothing opens: the agent gets `Use the trama-import skill on this repository.` and no sentence about folders | ☐ |
| J4d | In a project, open Settings and press **Guided setup** (top right, tooltip `Review the main settings step by step`) | The button and the form give way to the wizard in the Settings mode: `omp`, `Models`, `Project`, `Advanced`, `Summary`, with **Cancel** and no **Back** on `omp`. The confirm button reads **Save settings**; it saves only the changed keys and returns to the form. **Cancel** returns to the form with nothing saved. Change a setting from the editor's own settings while the wizard is open: the wizard keeps its value and the summary compares with the one that holds now | ☐ |
| J4e | Open the **Settings** view in a project, in the light and the dark theme, then narrow the panel to about 480 px and to about 300 px | One centred column of at most about 720 px (the whole width minus the margins when narrower); the page never scrolls sideways and nothing leaves the column or is cut. The title `Settings` is the page heading, with **Guided setup** on its row at the right; under about 480 px the button goes under the title, at the left. There is no grid of side-by-side columns, no index and no group selector | ☐ |
| J4f | Read the page from the top to the bottom | The groups `omp`, `Models`, `Project` and `Advanced`, one under the other, each with its title and, under it in secondary text, the sentence of the same step of the wizard (`omp is required: Trama runs every agent with omp.`, `Choose the model for each kind of work.`, `Choose where Trama installs the agent skills.`, `Theme and optional features.`); `Advanced` has the subtitles `Appearance`, `Drifts`, `Agents` and `omp Chat` in that order. There is no `Features` group. `Auto Exit` and `Language` are at the end of `omp`, `Language` is an editable text field with no note under it. Each setting has its bold title (a checkbox is left of it), its explanation under it, the control and, for an enum, the description of the chosen value; no «i» and no bubble; under `Analysis`, `Execution` and `Scan` the advice in bold (`Your most capable model.`, `A mid-range model.`, `A fast, light model.`) comes before the explanation | ☐ |
| J4g | In the `omp` group look under the sentence and after the settings; set `Omp Path` to a path that does not exist, then empty it | Under the sentence, before the settings, the bordered box of the wizard's `omp` step: `Checking omp…` with a spinning icon, then `omp <version> answered with <N> models.` with the check icon, or, in the warning colour, `omp not found at <path>. Trama cannot work without omp.` with **Install omp** inside the box. The tab never says `Updating omp to …` nor `Could not update omp`. The box is checked again every time the view is shown, when `Omp Path` changes and when the installer terminal ends | ☐ |
| J4h | In a project with an `AGENTS.md` at the folder's root, open Settings; turn `Ignore Instruction Files` on and off; press the link; leave the view and come back after deleting the file | After the settings of `omp`, the warning box `Agent instruction files found…` with a link `Open AGENTS.md`; the line `Trama's omp jobs ignore these files.` appears and goes away as the setting changes. The link opens the file in an editor tab that is not a preview, and the panel stays on Settings. Back on the view the search is done again and, with no file, the box is gone. With no project, or while the search runs, there is no box | ☐ |
| J5 | `cat /tmp/trama-empty/.trama/model/system.md` | `# Trama empty` heading and `Describe what this System is and who it is for.` | ☐ |
| J6 | Remove `.trama` (`rm -r /tmp/trama-empty/.trama`), put the text `custom` into `.agents/skills/trama-scan/SKILL.md`, put a visible file in the folder, then in Get Started choose **Start from Scratch** and confirm the summary | The warning about the visible file shows in the `Path` step (no dialog); on confirming, a **modal** warning `Trama did not initialize this project.` whose detail lists `…/trama-scan/SKILL.md`, with one button **Overwrite and Initialize** | ☐ |
| J7 | Press Esc/Cancel | Nothing is created; `custom` is still in the file; the wizard shows no message and stays on the summary | ☐ |
| J8 | Repeat J6 and click the button | `.trama/` is created and the skill file is overwritten | ☐ |
| J8a | Make the user settings file read-only and confirm a summary that changes a setting | A box with a circle-alert icon and `Could not save <setting>: <reason>.` shows in the bar of buttons, above the buttons, in the error colour (announced as an alert); nothing is initialized and no agent starts; **Set up Trama** keeps its text. After making the file writable, pressing it again writes only the keys not yet saved | ☐ |
| J8b | While the confirmation runs (a modal is open), try to press any wizard button | Every button is disabled, the ones of the indicator and the **Edit** of the summary too, and the confirm button shows a spinning icon | ☐ |
| J9 | In the demo window open Get Started (it already has `.trama/`) | The panel shows the project, not Get Started | ☐ |
| J10 | `mkdir -p /tmp/trama-empty2/.vscode && printf '{"trama.skillsDir": ".custom/skills"}\n' > /tmp/trama-empty2/.vscode/settings.json`, open that folder in a new window with the extension, **Trama: Open**, choose **Start from Scratch** and go to `Project` | The field shows the notice that the workspace setting overrides it (`.custom/skills`); confirm: skills land in `.custom/skills/trama-*/SKILL.md` and `.agents/` is not created, and no workspace setting is written | ☐ |
| J11 | Close the panel at any step and open Trama again | The wizard starts over from `Path` with the current settings; nothing was saved | ☐ |
| J12 | Keyboard and screen reader: Tab through the wizard, switch steps, use the choices of `Path` with the arrows and the tree of `Folders` with the arrows and Space | Everything is reachable; each change of step puts the focus on the step title, which is announced, and scrolls to the top; the indicator is the navigation `Setup steps` and marks the current step with `aria-current="step"`; each setting's explanation is read as the description of its control; the agent check is read as a polite status; no tooltip appears by itself, only with the pointer over the control or with its focus, and it goes when the pointer leaves or the focus moves | ☐ |

---

## K. Appearance and accessibility

| # | Action | Expected | ✓ |
|---|---|---|---|
| K1 | With **Theme** on `Auto` in Settings (Advanced, Appearance), switch the editor to a light theme (Ctrl+K Ctrl+T) and look at every tab and each Diagram level | The panel has its own zinc and blue look, light; text, edges, badges, tags and ghost colours stay readable; no white text on white; the buttons, badges and tabs show lucide icons (no icon font) | ☐ |
| K2 | Switch the editor to a dark theme, then to a high contrast one (dark and light) | The panel changes at once, without reloading: dark for dark and high contrast, light for light and high contrast light; same readability | ☐ |
| K2b | Set **Theme** to `Light`, then to `Dark`, and change the editor theme each time | The panel keeps the theme chosen, whatever the editor does; back to `Auto` it follows the editor again | ☐ |
| K3 | Narrow the editor group to about 700 px | Board scrolls horizontally (columns keep a minimum width); the Diagram canvas is not hidden by the panel | ☐ |
| K4 | Use only the keyboard on the Board (Tab, Shift+Tab, Enter) | Every button is reachable and shows a visible focus ring | ☐ |
| K5 | Hover disabled buttons | Disabled **Approve** shows its reason; so does a disabled **Run all** | ☐ |

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
| M3 | In the panel, click **Interface** | The Requirements tab still shows both Areas; `order/Paid` has a cyan left border and light cyan background, the focus bar above the page reads `requirements/ui#order/Paid` and the page scrolled to the section. There is no "Showing …" row and no **Show all**; **Clear** (or Escape) removes the marks and the bar | ☐ |
| M4 | Verification shell: `j model show order/Preparing` | Ends with `## Requirements`: `requirements/ui#order/Paid (via order/Paid)`, `requirements/data#order (via order)`, `requirements/ui#checkout (via checkout)` | ☐ |
| M5 | `ls /tmp/trama-demo/shop/.agents/skills` after `j project edit` | `trama-req-data-main` and `trama-req-ui-main` next to the Trama skills; `trama-req-ui-main/SKILL.md` has `description: Use when building or changing screens…`. The output has the line `Requirement skills: one skill per fragment (budget <n>/4000 characters).` | ☐ |
| M5b | `mkdir /tmp/trama-demo/shop/.agents/skills/trama-fix` with a file inside, then `j project edit` | The output has a line `Deleted the retired trama-fix skill:` naming the folder; it does not exist any more. Running it again prints no `Deleted` line. In the editor, **Trama: Update Agent Skills** shows the same line in its notification | ☐ |
| M6 | Edit `.trama/requirements/ui/main.md` by hand: change "Mobile first" to "Mobile first, always" and save | Within a second `.agents/skills/trama-req-ui-main/SKILL.md` says "Mobile first, always". The Requirements tab shows the new text | ☐ |
| M7 | Append `## order/Lost` and a line to `ui/main.md`, save | The yellow bar: "The Model or its Requirements have 1 validation error"; the link `requirements/ui/main.md:<line>` opens the fragment. Remove the section again: the bar disappears | ☐ |
| M8 | `j proposal new "Blue badge"`, then `j proposal edit <id> requirements/ui/main.md`, change "green" to "blue" in the printed file and `j proposal submit <id>` | On the Board the submitted card lists `requirements/ui/main.md ~1` and has **View requirements**, not **View on diagram**. `j proposal show <id>` labels the file with Area `ui` and fragment `main` | ☐ |
| M9 | Click **View requirements** | Requirements tab with the Proposal selected: `order/Paid` has a **changed** badge, the old text struck through above the new one | ☐ |
| M10 | `j proposal edit <id> checkout/order.md`, delete the `### Paid` State and its sub-States in the printed file, then `j validate --proposal <id>` and `j proposal submit <id>` | The edit withdraws it into Draft. Both commands fail with the missing State and Requirement errors; it is absent from the selectors and decision count | ☐ |
| M11 | `j proposal discard <id>` | The Draft is discarded; `ui/main.md` and the skill unchanged | ☐ |
| M12 | `j proposal new "Order screens"`; `j proposal edit <id> requirements/ui/main.md` and remove the `## order/Paid` section; `j proposal edit <id> requirements/ui/orders.md` and write a front matter `description: Use when building the order screens.`, `# Order screens` and the `## order/Paid` section with "green" changed to "blue"; `j proposal submit <id>`; select it in the Requirements tab | Interface shows **main.md** without order/Paid, then **Order screens** `orders.md` with the badge **new fragment**; inside it `order/Paid` carries **moved from main** and **changed**, the old text struck through above the new one. `order/Paid` appears nowhere else | ☐ |
| M13 | `j proposal edit <id> requirements/ui.md`, then `j proposal edit <id> requirements/ui/x/y.md` | Both are refused, saying Areas are folders and an Area has no subfolders | ☐ |
| M14 | Reject the Proposal of M12. Append 1,300 lines `- A rule.` to `ui/main.md`, then `j model check` and `j analyze` | `validate` says the Model and its Requirements are valid, exits `0`, then `1 warning(s)…` naming `requirements/ui/main.md` with its size over 12288 (12 KB). `analyze` lists `[large-fragment] requirements/ui/main.md: …`. Undo the lines | ☐ |
| M15 | Make the description of `ui/main.md` longer than 4,000 characters and run `j project edit` | `Requirement skills: one index skill per Area (budget <n>/4000 characters).` and `Switched from one skill per fragment to one index skill per Area.`; `.agents/skills` holds `trama-req-data` and `trama-req-ui` (with `SKILL.md` and `main.md`) and no `trama-req-*-main`. `j requirements ui` ends its header with ``Load: skill `trama-req-ui` ``. Restore the description and run it again: the fragment skills come back with `Switched from one index skill per Area to one skill per fragment.` | ☐ |
| M16 | Migration: in the verification shell `rm -r $D/requirements/data && printf -- '---\ndescription: "Data."\n---\n# Data\n\nAll amounts.\n\n## order\nCents.\n' > $D/requirements/data.md`, then `j model check` | One error on `requirements/data.md` telling to run `trama project edit` | ☐ |
| M17 | `j project edit`, then `ls $D/requirements/data` and `cat` both files | The output says `Converted 1 single-file Requirement Area(s) … : data`. `area.md` holds the description, `# Data` and `All amounts.`; `main.md` the same description and title with `## order` and `Cents.`; `requirements/data.md` is gone and `j model check` is clean. A Task referencing `requirements/data#order` still shows its text. Recreate a `requirements/data.md` next to the folder and run it again: `Left 1 single-file Requirement Area(s) as they were: data (requirements/data/ already exists)` | ☐ |

---

## N. Dependent Proposals and import

| # | Action | Expected | ✓ |
|---|---|---|---|
| N1 | Verification shell: `j proposal new "Bank" --import`, `j proposal edit <A> actors/bank.md`, write an Actor `# Bank` with an Event `TRANSFER_RECEIVED`, then `j proposal submit <A>` | Board: handed-over card for A with an **import** badge | ☐ |
| N2 | `j proposal new "Billing" --import --requires <A>`, then `j proposal edit <B> billing/feature.md` (write `# Billing`) and `j proposal edit <B> billing/invoice.md` (a Machine with `### Open (initial)` → `` - `bank.TRANSFER_RECEIVED` → Paid `` and `### Paid (final)`), then `j proposal submit <B>` | Submission succeeds despite A not being approved. Card B has **import** and **requires A** badges; **Approve** is disabled until A is approved | ☐ |
| N3 | Diagram: pick Proposal B in the selector | The **Bank** Actor is drawn as normal (not as a ghost), **Billing** and **Invoice** as added; the panel says "Drawn on top of Proposal A, not yet approved" | ☐ |
| N4 | Approve A, then B, from the Board | Both approved; no agent is launched (import Proposals start no Scan); `j model check` is valid | ☐ |
| N5 | Repeat N1 and N2, then reject A | Card B stays, with **requires A** in red and Approve disabled: "Proposal A "Bank" was rejected" | ☐ |
| N6 | **Trama: Import from Code** on a repository with code (agent configured) | The agent receives `Use the trama-import skill on this repository.`, asks one round of questions (folders, Feature split) with a recommended option each, then writes Proposals: one for the System and Actors, one per Feature requiring it, each ending with `## Doubts` | ☐ |

---

## O. Draft hand-over

| # | Action | Expected | ✓ |
|---|---|---|---|
| O1 | Board tab after reset | Nothing for Inventory checks: no card, no band, no Discard button | ☐ |
| O2 | Inspect Diagram and Requirements selectors and Board badge | No Draft in either selector or the decision count | ☐ |
| O3 | `j project show` | Inventory checks is listed under **In writing** marked `(draft)`, apart from To decide | ☐ |
| O4 | Attempt to keep what happens on the Inventory Drift, whose attached Proposal is still a Draft | The left **Keep this** looks disabled with the still-being-written reason and the click shows the editor warning; a direct host or CLI attempt is refused too | ☐ |
| O5 | Submit the Draft with `j proposal submit 4` | It appears in To decide and the Diagram selector; the badge increases by one | ☐ |
| O6 | `j proposal edit 4 checkout/order.md`, without changing its contents | Notice says returned to Draft; overlay and decision card disappear and nothing replaces them on the Board | ☐ |
| O7 | `j proposal discard 4` | It is marked discarded, with no confirmation and no feedback asked | ☐ |

---

## P. Agent question rounds

Use the [question request contract](./cli.md#question-rounds) with `trama question new --root /tmp/trama-demo/shop --input - < round.json`. Include single-choice and multiple-choice questions, with different recommendations, a `context` and an option with `details`. Run P1–P6e in VS Code.

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
| P6c | Start a round, press **Minimize**, then **Open questions** in the bar | A bar at the top of the panel reads `The agent is waiting for your answers (question <n> of <total>)`; the views behind are usable. Open questions brings back the same question with what was typed | ☐ |
| P6d | With a round open, close the Trama panel, then press **Reopen** | The notice `Trama has questions from the agent waiting.` appears; Reopen opens the panel on the same question. Pressing **Close** (×) in the overlay asks the Skip all confirmation instead of closing | ☐ |
| P6e | Narrow the panel below 600 px | The index becomes a row of numbered dots coloured by state, ending with `Σ` for the summary; each dot's tooltip names its state and question | ☐ |
| P7 | Start two rounds in one window; cancel the queued caller, then cancel the active caller with another round queued | Cancelling the queued caller leaves the active overlay as it is. Cancelling the active caller closes it and opens the next FIFO round, with no orphan overlay | ☐ |
| P8 | Leave a multi-question round with text typed after one confirmed answer; queue two more `trama question new` rounds; remove or rename `.trama/` in the fixture | All three return `editor-interrupted`, no answers, and the overlay disappears; queued questions never appear | ☐ |
| P9 | Close the editor with one `trama question new` round active and another queued | Both return `editor-interrupted`; a later new request without an editor returns `unavailable`, not an interruption or skipped answers, and the agent stops, asks the developer to open the project in the editor with Trama and runs the same `trama question new` again when told to continue | ☐ |
| P10 | Keep a round pending in one window while completing one in another; change focus between same-project windows | Windows remain independent. Discovery chooses the most recently focused live window; an endpoint supplied by a Trama-launched terminal takes precedence | ☐ |
| P11 | Read the three shipped interview skills and exercise an explicit skip, initial absence and admitted-round interruption | Skips are reported as assumptions, initial absence makes the agent stop and ask the developer to open the editor (never its own question tool), and interruption stops the workflow without retry or creating work from unanswered decisions | ☐ |

---

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
| U12 | `j proposal reject P1 --feedback x` (with `TRAMA_AGENT` unset) | Proposal `0001` is rejected. `j proposal list --all` shows it by its identity `0001`, with no number, and Proposal `P2` keeps its number. `j drift move D1 dismissed` behaves the same way for the Drift | ☐ |
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
| V1 | `j task list --input '{"runnable":true,"max":2}'` | Up to two runnable Tasks per line, `<number> <title>`, the first being the one `task list` with `runnable` and no `max` names; no two concern the same thing (for example never `order` together with `order/Paid`). Nothing moves. Also try `"max":1` and verify that only the first Task is returned; `"max":0` and `"max":"x"` are usage errors. | ☐ |
| V2 | `j --json task list --input '{"runnable":true,"max":2}'` | `batch`: the same Tasks, each with `id`, `number` and `title` | ☐ |
| V3 | Move every Task in To do to Done with `j task move <id> done`, then `task list` with `runnable` and `max`, and again without `max` | The two outputs are identical: `No Task is runnable.` and the Tasks left | ☐ |
| V4 | `j proposal show 1` before approving it | A `## Scan scope` section, computed now, with the references of the changes; after approving it, no `## Scan scope` section: nothing is saved at approval | ☐ |
| V5 | 🪙 With a real agent that has sub-agents, **Run all** with at least three Tasks on different Machines | The agent hands each Task of a group to a sub-agent, waits for all, runs `trama task list` with `runnable` and `max: <N>` again, runs tests, lint and build once at the end, then scans only the references returned by `trama task scope` for the Tasks it completed and reports the Tasks and Drifts filed | ☐ |


## X. Terminal agents and model roles

Written from the Requirements; these settings only count in your **user** settings. Set them there (Preferences: Open User Settings (JSON)) and remove them at the end. Start with S2 and inspect the command in each new terminal.

| # | Action | Expected | ✓ |
|---|---|---|---|
| X1 | Put `"trama.ompPath": "/tmp/other/omp"` in the workspace settings only, reload, click **Scan System** | The command runs `omp` from the editor's PATH: project settings cannot change the program Trama runs | ☐ |
| X2 | User settings: `"trama.scan": "my model"`. Click **Scan System** | The omp command uses `--model 'my model'` and the scan instruction | ☐ |
| X3 | Remove `trama.scan`, click **Scan System** | omp receives no `--model` or `--slow` option | ☐ |
| X4 | Set `"trama.analysis": "opus"`; click **Scan System**, then write `x` in an **Add Work Item…** request and send it | The scan uses `trama.scan`, not `trama.analysis`; the design instruction names the request file and uses `--model 'opus'`, with no sub-agent sentence | ☐ |
| X5 | 🪙 With omp installed: set `"trama.scan": "sonnet"`; click **Scan System** | omp uses `--model 'sonnet' --slow 'sonnet'`, and the prompt ends with `Compare each Machine with the trama-analysis sub-agent.` | ☐ |
| X6 | 🪙 With omp: set `"trama.scan": "sonnet"`; click **Scan System** | omp is started with `--slow sonnet` and receives the sub-agent sentence | ☐ |
| X7 | With omp, set `"trama.ompPath": "/tmp/bin/my omp"` (a script in a folder with a space in its path that writes its arguments to a file) in user settings; click **Scan System**, then **Ask more** on a card | Both commands start with `'/tmp/bin/my omp'` (quoted for the shell), the scan with `--hook` and the instruction, the Ask more terminal with the fixed instructions file and `--model` only when `trama.analysis` is set | ☐ |
| X8 | `trama project edit` (or **Trama: Update Agent Skills**), then inspect `/tmp/trama-demo/shop/.omp/agents/trama-analysis.md` and check for `trama-triage.md` | The `trama-analysis` definition has `model: "@slow"` and names `trama-scan`; the obsolete triage file is absent | ☐ |
| X9 | Put `"trama.ignoreInstructionFiles": true` in user settings. In the project add an `AGENTS.md` and `.cursor/rules/style.mdc` with some text; click **Scan System** | The omp command has `--config '<extension storage>/launch.yml'` and no `--advisor`; that file lists `disabledExtensions` with `"context-file:project:AGENTS.md"` and `"rule:style"`, and nothing in the repository changes | ☐ |
| X10 | In `<project>/.omp/config.yml` put `disabledExtensions: [my-ext]`, then repeat X9 | `launch.yml` lists `"my-ext"` first, then Trama's identities, with no duplicates | ☐ |
| X11 | 🪙 With omp 18.12, repeat X9 with a task that starts a sub-agent (`task`, `trama-analysis`) and, with `"trama.advisorScanner": true`, a Run | The agent, its sub-agents and the advisors do not mention the rules of `AGENTS.md` or `style.mdc`; with the Advisor Scanner the command also has `--advisor` and `TRAMA_ADVISOR_SCANNER=1` is in the terminal | ☐ |
| X12 | Delete `AGENTS.md` and the rule (or turn the setting off) and click **Scan System** | With no instruction file found the command has no `--config` (without the Advisor Scanner); with the setting off the launch is as before | ☐ |
| X13 | Set `"trama.ompPath": "/tmp/none/omp"` (does not exist) in user settings and click **Scan System**, then **Ask more** on a card | Each launch is refused with the warning that omp is missing, offering **Install omp**; no terminal or conversation opens and no ghost is left | ☐ |
| X14 | With omp missing, in the wizard step `omp` or in the Settings tab press **Install omp** | A visible terminal named `Install omp` opens and runs exactly `curl -fsSL https://omp.sh/install \| sh` (on Windows `irm https://omp.sh/install.ps1 \| iex`); nothing runs before the press; a `.vscode/settings.json` in the workspace with `trama.ompPath` or other keys does not change the command. When it ends the omp check repeats | ☐ |
| X14a | In the `omp` group of the Settings tab (omp installed), look under the status box | A **Providers** section (a heading one level under `omp`, with `Log in to the model providers you use with omp.` under it): a list named `Providers` with ChatGPT, Anthropic, GitHub Copilot, Google Gemini CLI, Google Antigravity, Cursor and xAI Grok in this order, each with its subscription under its bold name, **Connected** with a check icon (success colour) or **Not connected**, and a small outline **Log in** / **Log in again** button with a log-in icon. The states are the providers of the models of `omp models --json`, whatever the way omp reaches them. With `trama.ompPath` at a path that does not exist the section is gone, with no empty space | ☐ |
| X14b | Press **Log in** on the Anthropic row; then press **Log in again** on another row | Each press opens a new visible terminal in the terminals area (also with `trama.terminalLocation` set to `editor`), named `Log in to Anthropic`, in your home folder, with the cursor in it, running exactly `<omp> login anthropic` (the program quoted for the shell); the first terminal is not closed or reused; no editor notice shows. Complete the login in the browser or the terminal | ☐ |
| X14c | End the login command (finished or failed), or close its terminal before it ends | The omp status, the number of models, the **Connected** marks and the model suggestions refresh once, with no notice; the terminal stays open until you close it. Nothing of the terminal or of omp's credentials is read: a fake `omp` that logs its `argv` shows only `login <id>`, `models --json` and `--version` calls, never `token`, `auth export` or `usage accounts` | ☐ |
| X14d | Hover the Google Gemini CLI and Google Antigravity names and buttons, and focus their buttons with the keyboard; make the fake `omp models --json` fail | A tooltip with `Gemini models through Google Cloud Code Assist, the Gemini CLI login.` (Antigravity: `Gemini, Claude and GPT-OSS models through Google's Antigravity login.`) shows on the name, and over the button's own sentence `Open a terminal that logs omp in to <name>` on the button, which names the description with `aria-describedby`; no tooltip shows by itself. With the list failing every row has **Log in** and no state | ☐ |
| X15 | 🪙 With an omp older than the latest, click **Scan System** | A notification says omp is being updated to the new version, then the launch runs with the new omp (`omp --version` shows it); `omp update --check` and `omp update` run without a shell and with fixed arguments (a fake `omp` script logging its `argv` shows `update --check` then `update`) | ☐ |
| X16 | Disconnect the network (or use a fake `omp` whose `update --check` exits with 1) and click **Scan System**, then click it again within the hour | The first launch shows one warning that the check failed and starts with the omp already installed; the second launch does not run `update --check` again (the log of the fake `omp` has one entry) and shows no warning; after an hour the check runs again | ☐ |
| X17 | With omp installed by Homebrew (`omp update` reports it is managed by Homebrew), click **Scan System** | The check reads the answer as up to date, no update runs and no warning shows; the launch starts normally with `omp` from the Homebrew PATH | ☐ |

---

## Y. Runs and Drift decisions

Drifts are never resolved on their own: there is no delegation, no automatic approval and no automatic Run.

| # | Action | Expected | ✓ |
|---|---|---|---|
| Y2 | With several open Drifts, press **Resolve** on the card of one of them | Only that Drift is gathered: the agent asks the decisions and hands over a resolution to review; nothing is approved or run until you decide, and the Tasks that come out of it start by hand | ☐ |

---

## Z. omp Chat

Written from `quality#omp-chat-conversation`. Use omp 18.12.6 or later with ACP protocol 1, with omp Chat on (it is on by default; `"trama.ompChat": false` in the **user** settings turns it off, and the workspace setting is ignored); try the view in VS Code 1.106 or later (secondary sidebar). Compatibility: proven with omp 18.12.6 (`omp acp`, ACP protocol 1); the open checks are redone with every omp version that changes ACP. Remove the settings at the end. 🪙 steps need a real agent.

| # | Action | Expected | ✓ |
|---|---|---|---|
| Z1 | Reload the window with omp Chat on (the default) and no conversation, in VS Code 1.106 or later | The `omp Chat` view exists in the secondary sidebar, with the Trama logo, and shows `Trama's jobs with omp open here, one conversation each.`; no other sidebar or panel is opened, closed or moved | ☐ |
| Z2 | 🪙 Send a design request, click **Scan System**, and start a Run with `"trama.advisorScanner": true` | Each job opens a conversation named like the terminal it replaces (`Design`, `Scan`, `T3`/`All tasks`), without taking the focus (the cursor and the keyboard stay where they were), the view being shown on it where it is; the process is `omp … acp`, with `--yolo` only when `trama.ompChatApproval` is `yolo` | ☐ |
| Z3 | 🪙 Let a job finish with `"trama.autoExit": true`, then with `false` | On: the conversation disappears when the agent is idle and its process ends. Off: it stays, idle, and you can keep talking to the agent | ☐ |
| Z4 | Click **Ask more** on a Proposal | It opens a conversation (`Ask P<n>`) and takes the focus, in the message field, in both editors | ☐ |
| Z5 | 🪙 In a Quick Task ask the agent to use its question tool | The question shows in the conversation as a form with options, a text field, `Submit` and `Skip`; after `Submit` it stays read-only with the answers | ☐ |
| Z6 | 🪙 While the agent works, press **Stop**, then confirm; start another turn and close its tab with the `X` | A modal asks `Stop the agent in <name>?` and, on closing, `Close <name> and stop its agent?`; **Cancel** does nothing; confirmed, the turn stops and the conversation closes. A stopped conversation closes without a dialog | ☐ |
| Z7 | 🪙 Send a message while the agent works; change the model in the selector | The message reaches the agent without stopping it (or waits for the end of the turn if omp has no steering); the new model applies from the next turn and is not saved in the roles or in the Proposal | ☐ |
| Z8 | 🪙 Put a server in `<project>/.omp/mcp.json` and ask the agent which MCP tools it has; then put one only in `.mcp.json` | The first is visible to the agent; the second is not read | ☐ |
| Z9 | 🪙 Kill the omp process of a working conversation with `kill -9` | Within about one minute the job ends with the notice of a vanished agent and its Task, if taken, is released | ☐ |
| Z10 | 🪙 Reload the window during a Run | The conversation comes back, shows `The window reloaded; the agent continues its work.` and the fixed message that tells the agent to continue; the Task stays taken. The omp Chat view is shown on the conversation without taking the focus | ☐ |
| Z11 | 🪙 Delete the omp session of an open conversation (omp's session folder), then reload the window | The conversation is removed, its job ends with `the agent's session could not be resumed`, and no half conversation is left | ☐ |
| Z12 | Set `"trama.ompPath"` to a wrong path and click **Scan System** | The work does not start: no terminal and no conversation open, no ghost appears, and the notice that omp is missing shows with **Install omp** (the same notice as X13) | ☐ |
| Z13 | Turn `trama.ompChat` off while a conversation is working | The conversation keeps working and the view disappears only when the last one closes | ☐ |
| Z14 | Do not set `trama.ompChat` at all and open the Settings view | The `omp Chat` checkbox is on and enabled, with no note; omp Chat is in use with the permissive approval | ☐ |
| Z15 | Put `"trama.ompChat": false` in the workspace settings only and reload | omp Chat stays on: only the user setting counts | ☐ |
| Z16 | 🪙 With `trama.ompChatApproval` at `ask` (the default), ask a Quick Task agent to run a command omp asks permission for; choose an option; then ask again and press **Stop** while it waits | The request shows in the conversation as a box with the warnings colour, `omp asks permission`, the tool call row and a button per option as omp gives them, `outline` for the ones that refuse; the tab has the warnings dot while it waits. After the choice the box stays read-only with the option; after Stop it says `Cancelled`. A message written while it waits is queued and does not answer it | ☐ |
| Z17 | 🪙 Set `"trama.ompChatApproval": "yolo"` in the user settings, open a conversation and ask for a command omp would ask about | The process is `omp … acp --yolo`, the command runs without asking and no request shows in the conversation; the omp terminal is not affected | ☐ |
| Z18 | 🪙 With the agent working, leave the choice at **Steer** and send a message; then choose **Queue** and send another | Steer: the message is shown without a label and the agent answers it in the same turn, while it is still working. Queue: the message shows `Queued` under its bubble until the agent takes it, and it is answered after the current turn ends; the `Queued` label goes away then. Checked with omp 18.12.6: its `initialize` answer has `_meta.steering.supported: true`; the mid-turn behaviour is not run yet | ☐ |
| Z19 | Choose **Queue**, close the window and open it again; then open a new conversation | The choice is still **Queue** in every conversation (it is saved in the window's state, not in the repository or the settings); a message sent while the agent is idle is sent as usual | ☐ |
| Z20 | 🪙 Make a message undeliverable, for example send it while a permission request waits and then press **Stop** | The message stays in place, with `Not delivered: <reason>.` under it in the error colour; a message that is held and then discarded by Stop shows this line | ☐ |
| Z21 | With omp Chat on, click **Ask more** on a card, and on a question of a Drift | A conversation opens at once, named `Ask <n>` (or `Ask question`), focused, with its message field empty and the transcript empty: nothing is sent yet. The placeholder is `Ask about <n> – <title>…` (a card with no short number shows its permanent identity; a question shows `Ask about this question…`). Under the field `Starting omp…` shows with **Send** disabled until omp is up, then it goes | ☐ |
| Z22 | 🪙 In that conversation, type a question and send it; then send a second message | The transcript shows only your message: no `Trama` label and no attached file. The agent answers the card's (or the question's) instructions and your question, not your words alone. The placeholder changes to `Message omp…` only after the first message; the Board shows the announcement `work` with the name `Ask <n>` only now. The second message goes alone and is answered as any other | ☐ |
| Z23 | Close the empty Ask more conversation with its `X`; click **Ask more** again and close the window before writing anything; reopen the window | No trace: the tab closes at once, no tab comes back after the reload, and the Board shows no announcement for it | ☐ |
| Z24 | Set `trama.ompPath` to a script that exits at once (for example `false`) and click **Ask more** on a card | No conversation opens. The terminal `Ask <n>` opens with the instructions and runs them, as with omp Chat off; a warning shows that omp did not start. Only now does the Board show the announcement `work` | ☐ |
| Z25 | 🪙 Open General (it starts with the window) and ask it what it is for and which command it uses for Trama work | It answers as the assistant of General for the project and for Trama (Model, Requirements, Proposal, Task, Drift, Board), uses the `trama` command line and the Trama skills for Trama work when you ask for it, and names no skill as a job. No message was sent at the start and no instruction text is shown in the conversation. Verified with omp 18.12.6 through an ACP probe: the marker of a file given with `--append-system-prompt` came back in the answer, and it did not without the option; the General start runs `omp … --append-system-prompt <file> acp` | ☐ |
| Z26 | 🪙 Reload the window, then send a message in General | General comes back with its saved session (the `sessionId` of the record) and the agent still answers as the assistant of General, so the option is added again on resume; the saved arguments in the workspace state do not contain `--append-system-prompt` | ☐ |
| Z27 | 🪙 With omp logged in to a Claude subscription, open a window with a folder, wait for General, open a conversation of a job and Ask more, and read the bar under the message field of each; run `omp usage --json` in a terminal. Then turn omp Chat off with a job still open, or resume a job with omp Chat off | In General, in each conversation of a job and in Ask more, even an empty one, in the row under the message field and right of the model selector, a thin bar with one entry per window of the provider of that conversation's model (`anthropic` for `anthropic/…`): a ring, `5h`, `7d`, `7d Fable` and the whole percentage each, the same as `omp usage`; no email or account appears, and the bars of conversations with different providers differ. Hovering an entry shows `Claude 5 Hour · <N>% used · resets in <duration>`; hovering elsewhere on the bar shows `anthropic usage – click for every provider`; the screen reader name is `anthropic usage: 5h <N>%, 7d <N>%, 7d Fable <N>%`. A window without General but with a job conversation (omp Chat off with a job still open) shows the bar and asks omp in the project folder too; a window with no conversation asks nothing. Verified with omp 18.12.6: through an ACP probe (`initialize`, `session/new`) the model identities that ACP gives a session have the provider before the first `/` (`currentValue` `anthropic/claude-opus-5-5`, options `anthropic/claude-3-5-sonnet-20240620`, …), the same as the `selector` of `omp models --json`; `omp usage --json` names the provider in `reports[].provider` (`anthropic`) and gives no display name, so the bar and the dialog use that id, and its `capacity` is keyed by the same id | ☐ |
| Z28 | 🪙 Send a message in General (or in any job's conversation) and let the agent finish its turn; repeat within a minute, then after more than a minute; open the `Usage` dialog meanwhile | The first end of a turn asks omp again and the percentages follow `omp usage`; an end of turn less than 60 seconds after the last request ended asks nothing; one after more than 60 seconds asks again, also when the last request failed. Opening a conversation asks only when the window has no report yet, and opening the dialog always asks. There is no timer: with nothing running the bar does not change | ☐ |
| Z29 | 🪙 With a window at 80 % or more (or one at 100 %) in the report | The ring and the percentage of that window are in the warning colour from 80 % and in the error colour at 100 %; the others stay in secondary text | ☐ |
| Z30 | 🪙 Change the model of a conversation (General's, a job's or Ask more) to one of a provider you have no subscription with (for example `openai/…` when only Claude has data), and look at another conversation | The bar of that conversation becomes only a compact `Usage` button with the `Gauge` icon, at once and without a new request; choosing a Claude model again brings the entries back. The bars of the other conversations do not change | ☐ |
| Z31 | 🪙 Click the bar, or `Usage`; then, with the dialog open, make `omp usage` fail (for example wrong `trama.ompPath` after the first report, or kill the process) and open it again | A `Usage` dialog opens with the last report at once, `Fetched <duration> ago` (`Fetched just now` under a minute) and, while omp is asked again, a turning `Loader` (stopped with reduced motion); then every provider with its windows (`<N>% used · resets in <duration>`) and the new report. After a failed refresh the dialog keeps the last report and adds `Could not refresh: <reason>.` under the title. Esc, the `X` or a click outside close it | ☐ |
| Z32 | Put a wrong path in `trama.ompPath` (user settings), or use omp with only API keys and no subscription, then reload and open General | No bar and no message anywhere (no notice, no line in the conversation about the usage). With the wrong path General shows its own `omp is not installed` line | ☐ |

---

## AA. Side menu

Written from `ui#menu-laterale` and `tech#menu-laterale`. Try it in VS Code 1.106 or later.

| # | Action | Expected | ✓ |
|---|---|---|---|
| AA1 | Open a window with no folder and click the Trama logo in the Activity Bar | The icon is there; the `Trama` view shows `Open a folder to use Trama.`, the primary **Open Folder** button and, at the bottom, **Settings**; **Open Folder** opens the editor's folder picker and **Settings** opens the panel on the Settings only | ☐ |
| AA2 | Open a folder with no `.trama/` | The menu has only **Get Started** and, at the bottom, **Settings**; **Get Started** opens the panel, or brings it forward, on Get Started. Finish the wizard: the menu becomes the project menu without reloading | ☐ |
| AA3 | In a project, read the menu from the top | **Board**, **Diagram**, **Requirements**, **Specs**, **History**, a gap, the primary **Scan System** and, at the bottom behind a line, **Settings**; every entry is as wide as the view with its icon to the left; Tab reaches them in that order and Enter or Space activates; the tooltip of each entry is `Open <name> in the Trama panel` | ☐ |
| AA4 | With a Proposal and a Drift waiting, look at **Board** and the icon; close the sidebar and decide one card | **Board** has a badge with 2 and the name `Board, 2 awaiting a decision`; the Activity Bar icon has the badge `2` with the tooltip `2 cards await a decision`; after the decision both say 1 (`1 card awaits a decision`), and with none the badge is gone. The numbers follow the files with the panel closed | ☐ |
| AA5 | With the panel closed click **Diagram**; then follow a reference chip to the Requirements; run **Trama: Show History** from the palette; close the panel | Each opens the panel or brings it forward on that view, and the highlighted entry (and `aria-current`) follows every change at once; with the panel closed no entry is highlighted. The sidebar is never opened, closed or moved by Trama | ☐ |
| AA6 | Click **Scan System** with the panel closed | The agent's scan starts as the old Board button started it (conversation or terminal), the panel does not open and the focus stays where it was; the count `· N` restarts. With `"trama.advisorScanner": true` the button works the same way, with its count and the same confirmation, and the scan starts with no advisor | ☐ |
| AA7 | Edit a skill by hand, then click **Board** | The panel opens at once; shortly after, the skills are brought in line and a short notice says so; with everything in line nothing is said. **Scan System** and **Open Folder** do not check the skills | ☐ |
| AA8 | In a folder with no project run **Trama: Show Board** | It does what **Open Trama** does | ☐ |

---

## AB. Thinking levels and language

Written from the Requirements. Set the model roles in user settings and remove them at the end.

| # | Action | Expected | ✓ |
|---|---|---|---|
| AB1 | 🪙 With omp 18.12 installed, set `"trama.scan": "anthropic/claude-haiku-4-5:high"` in user settings; open Settings | The `trama.scan` field shows `anthropic/claude-haiku-4-5` and a level Select with `high`; a Scan System launch passes the whole value to `--model` | ☐ |
| AB2 | With omp installed, open Settings and type a model name that omp does not list in `trama.analysis` | No level Select beside the typed name; the Combobox takes the whole row | ☐ |
| AB3 | In the level Select of a model role, choose `Default` | The setting becomes the model alone, with no `:` | ☐ |
| AB4 | Open the `trama.language` field in Settings, type `Italian`, press Enter; then open Guided setup | The field is enabled, empty by default, with no `Disabled for now` note; a workspace value that differs shows `The workspace setting overrides this: <value>.`; the `omp` step of the wizard shows `Language` after `Ignore Instruction Files` and no `Auto Exit` | ☐ |
| AB5 | With a Proposal whose model has a level, open the Board, then the model window of that Proposal | The card shows `<model> · <level>`; the window shows the model in its field and the level in a Select beside it | ☐ |

Not verified: the `--slow` option and the Advisor Scanner overlay (`modelRoles.advisor`) with a suffixed value, which omp 18.12.6 did not check at startup; a level changed in the model of an omp Chat conversation mid-session keeps the thinking level the conversation already has.


---

## L. Defect log

| Test ID | What you did | Expected | What happened | Severity |
|---|---|---|---|---|
| | | | | |

## Not covered

Licensing does not exist yet. Removing a whole Feature or Actor through a Proposal has unit tests only. The macOS `.vsix` has passed only CI checks, not a run on a real Mac. The Windows private-pipe bridge has not been exercised on Windows; the socket and native Quick Input paths have been exercised on Linux.
