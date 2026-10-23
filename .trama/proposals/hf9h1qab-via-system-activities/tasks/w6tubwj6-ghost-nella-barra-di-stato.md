---
technical: false
refs:
  - announcement
  - announcement/Announced
  - requirements/tech#announcement
  - agent-terminal
  - voce-history
  - work
  - requirements/ui#developer.ASK_MORE
  - requirements/ui#developer.OPEN_QUICK_TASK
---

# Ghost nella barra di stato

Quando il Task è finito, i fantasmi che non hanno una colonna della Board compaiono come un'unica voce riassuntiva nella barra di stato di VS Code (e di Cursor). Sono senza colonna i fantasmi di check/Scan (anche nella fase che aggiorna la History, `voce-history`), di comparison/Compare e di work: Import, Quick e Ask (`requirements/ui#developer.OPEN_QUICK_TASK`, `requirements/ui#developer.ASK_MORE`). Questo Task viene dopo quello della Board di questa Proposta: quale fantasma non ha colonna lo dice la funzione pura delle colonne in `src/core` creata da quel Task, che qui va riusata, senza una seconda regola.

## La voce

- È uno `StatusBarItem` creato dall'host, con id `trama.activities` e nome `Trama Activities` (così si può nascondere separatamente), allineato a sinistra (`StatusBarAlignment.Left`) con priorità più bassa di ogni altra voce di Trama (per esempio -10000): sta alla fine del gruppo di sinistra, il punto più vicino al centro che l'API consente. La voce del logo (`$(trama-logo)`, Open Trama) resta com'è.
- Compare in ogni finestra aperta su un progetto Trama, anche a pannello chiuso, e solo mentre esiste almeno un fantasma senza colonna; quando non ne resta nessuno si nasconde.
- Testo: `$(loading~spin) <titolo del fantasma annunciato più di recente>` e, se ce ne sono altri, ` +<N>` (es. `$(loading~spin) Scanning System +2`).
- Tooltip, una riga per voce: `<kind> · <title>`; la fase, se c'è; `Running for <durata>`, ricalcolato a ogni aggiornamento e ogni 30 secondi finché la voce è visibile; l'ultima nota, se c'è; `+<N> more running` quando ce ne sono altri. Kind, fasi e note sono quelli che la Board già mostra per i fantasmi (`ghostNotes`, `runningFor`, `ghostExplanation`, `ANNOUNCED_KIND_LABELS` in `extension/src/webview/board/logic.ts`): vanno riusati, se serve spostandoli in un posto condiviso con l'host.
- Nome accessibile: il nome accessibile del fantasma come sulla Board, poi `, and <N> more` se ce ne sono altri, poi `. Show details`.
- Tutti i testi sono in inglese e non seguono `trama.language`.

## Da dove arrivano gli annunci

L'host legge da sé gli annunci tramite `src/core` (`listAnnouncements` in `src/core/announcements.ts`, ordinati per `announced`; le viste in `src/core/snapshot.ts`, `announcementView`), anche a pannello chiuso: oggi lo snapshot esiste solo mentre il pannello c'è (`extension/src/host/controller.ts`, `create()`/`refresh()`), quindi la voce si aggiorna sul watcher globale `**/.trama/**` (`tramaFiles` in `activate`, `extension/src/host/main.ts`). Un annuncio entra quando è `announcement/Announced` ed esce quando viene ritirato (anche dal ritiro all'avvio, `withdrawAll` in `extension/src/host/announcements.ts`). Gli annunci nascono dai lanci del terminale dell'agente (`agent-terminal`; `announceLaunch` e i lanci di scan e Quick/Ask in `extension/src/host/agent.ts`). Il progetto della finestra si trova con `findProject` (`extension/src/host/project.ts`).

## Clic

Il clic esegue un comando che non compare nella command palette (escluso via `menus.commandPalette` in `package.json`).

- Con un solo fantasma senza colonna apre i suoi dettagli (vedi il Task "Dettagli dalla barra").
- Con più fantasmi apre un `window.createQuickPick`: i fantasmi dal più recente al più vecchio, etichetta il titolo, descrizione `<kind> · <phase>`, dettaglio l'ultima nota, placeholder `Choose an activity to see its details`. Resta aggiornato finché è aperto: i fantasmi spariti escono, i nuovi entrano in cima, e si chiude quando non ne resta nessuno. Scegliere un fantasma ne apre i dettagli; Esc o un clic fuori non fanno nulla.

## Dove lavorare

`extension/src/host/main.ts` (`statusBarItem`, `activate`, sottoscrizioni), un nuovo modulo host per la voce e il QuickPick, `package.json` (comando e esclusione dalla palette). I test che fissano `System Activities` (`test/host-agent-terminals.test.ts`) vanno aggiornati; serve una voce nel `CHANGELOG.md`, e i testi che nominano System Activities vanno sistemati.
