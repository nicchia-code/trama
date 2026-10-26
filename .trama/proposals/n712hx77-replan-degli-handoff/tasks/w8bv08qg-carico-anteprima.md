---
refs:
  - issue/Published
  - requirements/ui#issue/Published
---
# Carico con handoff aperti

Nell'anteprima di una issue di un handoff (`ui#proposal/Open`), il campo `Sprint` mostra sotto il valore, per l'assignee, `<first name> has <load> / <capacity> d in this sprint` in testo secondario, nel colore destructive quando supera la capacità.

Il carico ora conta, per quella persona in quello sprint:
- gli elementi aperti del Project collegato assegnati a lei (`rules#issue/Published`), come già oggi;
- questa issue;
- le altre issue di ogni handoff aperto (incluso questo handoff e quelli stale, mai un Draft) assegnate a quella persona in quello sprint, ciascuna con i valori del Manager applicati.

Prima contava solo gli elementi aperti di GitHub più questa issue. La Timeline non cambia: mostra solo le issue pubblicate.

Nel codice: `sprintLoadNote` in `extension/src/webview/team/logic.ts` (chiamata da `extension/src/webview/team/issue-preview.tsx`, dove oggi riceve `github?.loads`) somma i carichi di GitHub (`loads()` in `extension/src/host/team/github.ts`, `openLoads` in `src/core/timeline.ts`, `capacityIn`/`loadIn` in `src/core/sprints.ts`) e le issue di ogni handoff aperto presente nello snapshot (`Snapshot.handoffs` in `src/core/snapshot.ts`, prodotti da `handoffViews` in `src/core/team-views.ts`), con i valori calcolati come fa `appliedFields` in `src/core/issues.ts`, senza contare due volte la issue mostrata. Resta una funzione pura, testata senza DOM.
