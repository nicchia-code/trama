---
status: approved
base:
  editor-panel/panel.md: 71e5aa6044eeec99b91e115273d24e625ea10e94f74af00a9f052f925376f458
  requirements/rules/run-paralleli.md: aebecae04290d71937a6fc2b6df0646dfc05ae797c06b5f3a7b7d54b8f69d515
  requirements/tech/run-estimate.md: d0b993a0667c4eccebbc25d8750aaaa8e1942aebf539da984ed25bd098570da5
  requirements/ui/run-estimate.md: 5a056d25bf69d47ccadb5a0c5bc15840ffcff0549a2aaf2d388fee7a6c12778e
delete: []
request: 2026-10-25T09-41-42
created: 2026-10-25T08:51:08.740Z
label: Stima Run all
---
# Run all: più lungo del previsto

Molti Run all passano a `Taking longer than expected` mentre procedono normalmente. Con Parallel Execution il riferimento è il limite alto della prima stima, che nasce alla prima richiesta dei posti, 20–40 secondi prima che l'agente registri le scelte `order` e `conflict`: senza catene vale avvio + un solo Task + coda (limite alto circa 14 minuti) e resta fisso fino alla fine. Rifatti i calcoli sulle registrazioni dei tempi del progetto, 10 Run all su 16 sarebbero scattati pur andando normalmente (4 dei 5 dopo l'arrivo della barra).

Decisioni:
- Riferimento di «più lungo del previsto»: preso al primo Task preso dal Run all, quando il piano è registrato, come tempo passato dal lancio più il limite alto della stima di allora; si rifà a ogni cambio del piano (una nuova scelta `order` o `conflict`, un Task nuovo che entra nel Run), non con il solo passare del tempo né con la fine di un Task.
- «Più lungo del previsto» non è più definitivo: vale finché il tempo dal lancio supera il riferimento attuale; un cambio del piano può riportare il pulsante a `Running…`. Conta che la stima resti aggiornata.
- Il tempo dei Task con Parallel Execution resta com'è oggi: catena più lunga o somma dei pesi divisa per i posti.
- Il margine resta il limite alto della forchetta mostrata (1,5 volte la stima centrale).
- Per la stima di un Run all contano solo le registrazioni dei tempi fatte dal suo lancio in poi, anche in un terminale o una conversazione riusati.
- Avanzamento: lo 0,95 di quando il Run all è più lungo del previsto non conta come già raggiunto; tornando nei tempi la barra riprende dall'avanzamento calcolato, mai sotto il più alto raggiunto fuori da quello stato, e può quindi scendere sotto il 95% (il developer accetta che la barra torni indietro, purché la stima resti aggiornata).
- Riferimento rifatto solo quando il piano cresce (una scelta o un Task in più); un Task che esce dai Run non lo accorcia (scelta dell'agente, da verificare).

Affinamento sul Modello attuale:
- `editor-panel/panel.md` riscritto sul file attuale: tiene il nome della scheda dell'editor che segue la vista, la riga di Solo mode nelle impostazioni e l'avviso di Solo mode in Get Started, venuti da altre Proposal approvate; la Proposal cambia ancora solo la descrizione dello stato Board sul pulsante Run all.

## Already present

- `panel/Closed/developer.SHOW_BOARD` — `extension/src/host/controller.ts` (apertura del pannello su una vista, `pendingView`/`navigate`); non cambia
- `panel/Open/developer.SHOW_BOARD` — `extension/src/host/controller.ts` (`navigate` alla vista `board`); non cambia
- `panel/Closed/developer.OPEN_GHOST_DETAILS` — `extension/src/host/controller.ts` `openGhostDetails`, chiamato da `extension/src/host/main.ts` (`ActivitiesItem`); non cambia
- `panel/Open/developer.OPEN_GHOST_DETAILS` — `extension/src/host/controller.ts` `openGhostDetails`; non cambia
- `panel/Settings/developer.CONFIRM_SETUP` — `extension/src/host/controller.ts` `confirmSetup`, `extension/src/host/messages.ts` `parseConfirmSetup`; non cambia
- `panel/Settings/developer.CANCEL_SETUP` — chiusura del wizard in `extension/src/webview/settings/index.tsx`; non cambia
- `panel/Get Started/developer.INITIALIZE_PROJECT` — `extension/src/host/controller.ts` `confirmSetup` con `initializeProject` di `extension/src/host/project.ts`; non cambia
- `panel/Get Started/workspace.MODEL_CHANGED` — `extension/src/host/controller.ts` (`findProject` al cambio dei file); non cambia
