---
technical: false
refs:
  - drift-resolution/Running tasks
  - requirements/rules#drift-resolution/Running tasks
  - requirements/tech#drift-resolution/Running tasks
  - requirements/ui#drift-resolution/Running tasks
  - requirements/quality#drift-resolution
  - drift-resolution/Free/developer.ASK_AGENT
  - drift-resolution/In attesa delle scansioni/developer.ASK_AGENT
  - drift-resolution/Resolving/agent-hook.IDLE
  - drift-resolution/Resolving/terminal.COMMAND_ENDED
  - drift-resolution/Resolving/editor-chat.AGENT_STOPPED
---
# Avviso dei Task bloccati

Alla fine di ogni Run lanciato da Trama (un Task chiesto per nome, `Run all` in un solo Run o in una sequenza per modello, il Run automatico della delega), nel terminale o in chat, qualunque cosa lo concluda e in ogni modalità della delega, l'editor dice quali Task del Run sono rimasti bloccati, anche quando `trama.autoExit` ha già chiuso il terminale con il resoconto.

- Al lancio l'host fotografa, dal quadro dei Task di `src/core` (`blockedTasks`), i Task dell'ambito del Run eseguibili in quel momento (in To do, senza blocchi, non presi): per un Task singolo quel Task, in `Run all` i Task dei gruppi lanciati, nel Run automatico le correzioni e le origini autorizzate. La fotografia sta in memoria, legata al lavoro di tipo Run nel registro dei lavori (`extension/src/host/drift-resolution.ts`); nessun file sotto `.trama/`, nessun timer.
- Alla fine del Run, normale o anomala, l'host rilegge il quadro: i Task della fotografia in To do con almeno un blocco (un Drift aperto o l'attesa del Task di correzione) formano l'avviso, ciascuno con i blocchi di quel momento. Un Task in Done, In progress o in To do senza blocchi non entra; i Task nati durante il Run non entrano; senza Task da elencare non compare nulla.
- Tutte le vie di fine sono coperte: Task singolo e `Run all` di un solo gruppo passano da `send()` (`extension/src/host/controller.ts`), che riceve ora `onEnd` fino a `launchAgent`; la sequenza per modello dà un solo avviso al `finish` di `runSequence` (fine dell'ultimo Run o arresto); il Run automatico alla fine del suo `runJob`.
- L'avviso è un messaggio informativo dell'editor, che non prende il focus e non apre il pannello da solo, con il testo `Trama: the Run left <N> Task blocked: <elenco>.` (`Tasks` oltre uno). Ogni voce è `<numero breve> <titolo>` seguita da `(Drift D1)`, `(Drifts D1, D4)` oppure `(waiting for Task T9)`; voci separate da virgole nell'ordine dei Task, oltre la terza `and <K> more`; un Task senza numero breve usa l'identità permanente.
- Il pulsante `Show Board` apre il pannello Trama e manda il messaggio `navigate` con `view: "board"`, che esiste nel protocollo ma oggi l'host non manda.
- L'avviso non cambia colonne, non avvia nulla e non cambia il resoconto della corsa. Riaprire l'editor dimentica la fotografia senza avviso.

Test dell'host per il calcolo dell'elenco: Task bloccato da un Drift nato durante il Run → nell'avviso; Task finito → fuori; Task già bloccato al lancio → fuori; Task in attesa del suo Task di correzione → con `(waiting for Task …)`; nessun Task bloccato → nessun avviso; più di tre → `and <K> more`; una sequenza per modello → un solo avviso alla fine.
