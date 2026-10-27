# Shop: the sample project of the demo

A small online shop with real code and a lived-in `.trama/`. It is data for the website's demo, the harness and the manual acceptance run, not part of Trama. This file is for whoever maintains the demo scripts.

## Layout

- `.trama/model/` and `.trama/requirements/`: the Model (Features `checkout`; Machines `cart`, `order`, `payment`; Actors `user`, `stripe`, `warehouse`, `courier`) and the Requirements (`data`, `ui`).
- `.trama/proposals/`, `.trama/tasks/`, `.trama/history/`: the work that built the shop (see below).
- `src/`: the TypeScript code, small enough to read in a few minutes. `bun test examples/shop/src` runs its tests.
  - `events.ts`: the Events of the Model and a synchronous bus; the machines talk only through it.
  - `cart.ts`, `order.ts`, `payment.ts`: one class per Machine, each handler named after the transition it implements.
  - `checkout.ts`: wires the machines to the bus and to the outside ports.
  - `adapters/`: the Actors. `user.ts` (commands and screens), `stripe.ts` (webhooks to Events), `warehouse.ts`, `courier.ts`.
  - `money.ts`: amounts are cents; only screens format them.
- There are no discount codes: the tour's design adds them.

## The intended difference

The code implements the Model with one difference, the one the scan of the tour's Scan and Drifts chapter finds.

- Where: `checkout/order/Awaiting payment/payment.DECLINED`, in `src/order.ts`, method `declined`.
- The Model says: `payment.DECLINED` moves the order to `Cancelled` and tells the customer by email.
- The code does: the order moves to `Cancelled`, and nothing is sent. The code base has no mail port at all; `OrderRecord.customer` holds the customer's email address, so the data is there.
- Everything else matches the Model, so a scan of the System finds exactly this one Drift.

Sensible Fix options for the Drift, the first one recommended:

1. Fix the code: add a mail port to `ShopPorts`, call it from `declined` with the customer's address, and test it.
2. Change the Model: remove "tells the customer by email" from the transition (a Proposal), so that the code is right as it is.
3. Change the Model to another notice: replace the email with a message shown on screen after the refusal (a Proposal and a new Task).

The Proposal "Ordine e pagamento" and its Task "Ordine" do state the email, and the Task is in Done: the story is that the sending was dropped later, in a hand edit of the code, as happens in real projects. No History entry mentions it.

## The History

`.trama/` holds four approved Proposals, each with two Tasks in Done, and one History entry per Proposal, in Italian like the texts the agent writes for the developer:

| Proposal | Tasks | History entry |
| --- | --- | --- |
| Carrello e checkout | Carrello, Schermate del carrello | Il carrello del negozio |
| Ordine e pagamento | Ordine, Pagamento con Stripe | Ordine e pagamento con Stripe |
| Magazzino e corriere | Magazzino, Corriere | Magazzino e corriere |
| Annullamento e rimborso | Annullamento dell'ordine, Rimborso | Annullamento e rimborso |

There is no open Proposal, no Task in To do or In progress and no Drift: those come from the tour. The cards were produced by replaying the four designs with Trama's commands (`proposal new`, `proposal edit`, `proposal move`, `task move`, `history new`) on an empty project, so that the files are the ones Trama writes. The Model and the Requirements at the end are the ones in `.trama/model/` and `.trama/requirements/`.

`.trama/last-scan/` is local state that Trama ignores in git.
