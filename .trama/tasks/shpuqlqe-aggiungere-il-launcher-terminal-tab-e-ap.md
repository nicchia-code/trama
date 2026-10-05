---
column: done
technical: false
refs:
  - agent-terminal
  - agent-terminal/No agent terminal/developer.ASK_AGENT
  - agent-terminal/Agent running/developer.ASK_AGENT
  - agent-terminal/Agent idle/developer.ASK_AGENT
  - requirements/tech#agent-terminal
  - requirements/ui#agent-terminal
drift: null
proposal: acleu2vq
agent: false
created: 2026-10-05T17:51:09.319Z
---
# Aggiungere il launcher terminal-tab e aprire il terminale dell'agente come scheda dell'editor

L'impostazione `trama.agentLauncher` accetta anche `terminal-tab`, scelta a mano e sempre prioritaria. Il launcher `auto` non la sceglie mai: resta la chat in Cursor e il terminale integrato nell'area dei terminali negli altri editor. La descrizione in inglese dell'impostazione elenca il nuovo valore come dice il Requisito ui (il terminale integrato dell'editor, aperto come scheda dell'editor accanto a quella attiva) e non segue `trama.language`.

Con `terminal-tab` il terminale dell'agente è lo stesso terminale integrato, con lo stesso nome «Trama agent», la stessa cartella e le stesse variabili d'ambiente, ma aperto come scheda dell'editor:
- la prima scheda si apre in un gruppo accanto a quello attivo, così il pannello Trama e l'overlay delle domande restano visibili;
- se la scheda precedente dell'agente è ancora aperta e serve un terminale nuovo (perché l'agente sta ancora lavorando), la nuova si apre nel gruppo in cui Trama aveva aperto la precedente, senza creare un altro gruppo; se quel gruppo non esiste più, di nuovo accanto a quello attivo;
- aprendo o riusando la scheda, Trama la porta in primo piano e le dà il focus.

Tutto il resto si comporta come con «terminal»: riuso di un terminale libero, fine del comando scritto da Trama, chiusura della scheda come chiusura del terminale, annunci, avvisi ntfy, Task presi e round di domande, scansione automatica dopo l'approvazione. I terminali dei worktree restano nell'area dei terminali qualunque sia il launcher.
