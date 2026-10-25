---
column: done
technical: false
refs:
  - panel/Team
  - panel/Closed/developer.SHOW_TEAM
  - panel/Open/developer.SHOW_TEAM
  - team
  - requirements/ui#panel/Team
  - requirements/ui#github-project/Linked
  - requirements/rules#github-project/Linked
drift: null
proposal: slfwi6qi
agent: false
created: 2026-10-25T15:12:00.420Z
finished: 2026-10-25T17:31:25.283Z
---
# Scheda Timeline

La vista Team ha la scheda `Timeline`, fra `Issues` e `People`: la roadmap nel tempo, per persona o per epica, sugli sprint di una settimana del Project collegato. Quando il Task è finito:

- Schede nell'ordine `Decisions`, `Issues`, `Timeline`, `People`.
- Intestazione: interruttore segmentato `By person` / `By epic` (di base `By person`, ricordato finché il pannello è aperto) e a destra `Block width = estimate (full width = 5 days)`.
- Sprint mostrati: dal primo sprint, corrente o passato, che ha un'issue pubblicata aperta, o dal corrente se non ce ne sono, fino all'ultima iterazione del Project; colonna finale `No iteration` (`After <data>`) con le issue aperte senza sprint, a tratteggio leggero. Se l'ultima iterazione finisce meno di tre settimane dopo oggi, riquadro di avviso `The Project has no iteration after <sprint>.` con `Add iterations on GitHub`, che apre le impostazioni del Project nel browser.
- Griglia in una card: colonna delle corsie di circa 220 px, una colonna per sprint con titolo e date (`26–30 Oct`), lo sprint corrente con il `Badge` `Current` e le celle su sfondo primario chiaro.
- Per persona: una corsia per membro del team (avatar con iniziali, nome, `<capacità> d / sprint`), poi `Unassigned` e `Not in this team` quando servono; le assenze sono blocchi tratteggiati con `CalendarOff` e `Off <date>`, larghi quanto i giorni lavorativi che occupano; in basso a destra di ogni cella `<carico> / <capacità> d` in monospace, in colore distruttivo e con ` · over` quando si supera. Per epica: una corsia per epica con chip e `<n> issues`, e in ogni cella i giorni dell'epica.
- Blocchi delle issue: bordo `rounded-md`, punto colorato dell'epica, `#<n>` monospace, titolo troncato, `<d> d`; larghezza = stima su 5 giorni della cella, almeno quanto `#<n>`; tooltip e nome accessibile `#<n> <title> · <d> d · <status>`; clic apre l'issue su GitHub; chiusa attenuata con il numero barrato; con un segnale, bordo sinistro del colore del segnale. Ordine per dipendenze.
- Sotto i 720 px la griglia scorre di lato nella sua card con la colonna delle corsie fissa; la pagina non scorre mai di lato. Senza Project collegato la pagina `Link a GitHub Project`; senza issue pubblicate `No published issues yet: the timeline fills as handoffs are approved.` sopra la griglia vuota degli sprint.
- Solo vista: sprint, stime e assegnatari cambiano su GitHub; la ripianificazione è manuale.
- Anteprima di una handoff: il campo `Sprint` mostra per l'assegnatario `<nome> has <carico> / <capacità> d in this sprint`, contando l'issue, in colore distruttivo oltre la capacità.
- Realizzata in `extension/src/webview/team/timeline.tsx` con CSS grid e Tailwind, senza librerie di grafici né `ResizeObserver`; layout puro in `logic.ts` con test senza DOM. La griglia è una `table` con intestazioni di sprint e corsie; i valori di carico si leggono anche a parole (`<load> of <capacity> days, over capacity`). Testi in inglese.

L'immagine legata a questo Task mostra la timeline per persona con sprint corrente, assenze, sovraccarico e l'avviso degli sprint mancanti.
