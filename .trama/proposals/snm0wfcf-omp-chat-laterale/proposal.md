---
status: approved
base:
  actors/omp-acp.md: new
  actors/editor.md: c537d936d96d576921715e7bdf7509af4935d3596aa64dc35d30ea23528fb44e
  actors/developer.md: da28b2ad7702b588379bd49db33274d50961ae5f6b2dea1b576c34ab6698cedd
  actors/agent-hook.md: edba580a3e8b51b99431c07b640a5c4ef4e25010bb637c2af48c92ed88934a57
  agent-launching/omp-chat.md: new
  agent-launching/omp-chat-conversation.md: new
  agent-launching/agent-terminal.md: 5ccd2e97e4459c3eaa5049f178f59e668ff8eaaf4fee178827c791ecbbc3dcc7
  agent-launching/feature.md: 2f2aa8b2387c0c5f8ae228ffe8497fec9b1d629ad2669ab9a2772257ae9ad268
  editor-panel/panel.md: 4404e9b10ad1642db278bc66d6b9ce02080eeee6730d1a0d2bca323969fd40e8
  requirements/ui/omp-chat.md: new
  requirements/tech/omp-chat.md: new
  requirements/rules/omp-chat.md: new
  requirements/quality/omp-chat.md: new
  requirements/data/omp-chat.md: new
  requirements/ui/settings-specs.md: 1a7e09173b726f6c715d77d378b6bc478074da0a9be7b91cfb6406b1e3a744ea
  specs.yaml: d25b1f4aae661691d51079020e4b9fc59867456760569cec22da3142c8754c4a
delete: []
created: 2026-10-23T10:31:29.888Z
label: omp Chat
---
# omp Chat laterale

Con omp i lavori di Trama oggi partono in un terminale integrato. omp Chat sostituisce quel terminale con una chat nella barra laterale secondaria, come la chat di Cursor o di VS Code: ogni lavoro apre una conversazione in cui omp gira come server ACP (`omp acp`), e la conversazione segue le stesse regole del terminale di omp. È una funzione del gruppo Features, spenta per impostazione predefinita, che vale solo con `trama.agent` su `omp`. L'obiettivo è rimpiazzare il terminale di omp, non la chat di Cursor.

## Decisioni
- Ruolo: con omp Chat accesa tutti i lavori di Trama (design, scan, Run, Resolve, Unify, import), Quick Task e Ask more aprono una conversazione invece del terminale, e funzionano come oggi con omp.
- Posizione: barra laterale secondaria, vista omp Chat.
- Più conversazioni insieme, una scheda in alto per ciascuna, con il nome del lavoro come il terminale.
- Un processo `omp acp` per conversazione, con le stesse opzioni del terminale del lavoro.
- Permessi: sempre approvati (omp in modalità yolo), nessuna domanda di permesso.
- File: omp scrive su disco come nel terminale; l'editor non fa da file system.
- Server MCP: la sessione riceve quelli dei file nativi di omp (`.omp/mcp.json` e `~/.omp/agent/mcp.json`), perché `omp acp` non li cerca da sé; quelli di Claude, Cursor e degli altri strumenti restano fuori.
- Avvio fallito (omp non trovato, nessuna risposta, errore prima dell'istruzione): un avviso, e il lavoro parte nel terminale di omp.
- Libreria: SDK ufficiale ACP (`@agentclientprotocol/sdk`), aggiunto alle Specs.
- Fine con `trama.autoExit` acceso: la conversazione sparisce con il suo processo, come il terminale; spento, resta e il developer può continuare.
- Apertura: la barra si mostra sulla conversazione nuova senza focus; Quick Task e Ask more prendono anche il focus.
- Domande dello strumento di omp in Quick Task e Ask more: modulo dentro la conversazione.
- Contenuti: messaggi, ragionamento richiudibile, schede degli strumenti, piano dei todo; niente diff.
- Campo del messaggio: Stop con conferma in un dialogo modale, messaggi mentre l'agente lavora, selettore del modello.
- Chiudere una conversazione che lavora chiede la stessa conferma di Stop.
- Ricarica o chiusura della finestra: una conversazione si ripristina solo se la sua sessione di omp si riapre, e se lavorava riprende da sola con un messaggio fisso; altrimenti si perde e il lavoro finisce come per un agente scomparso. Nessun recupero parziale.
- Spenta, o con la chat di Cursor: nessuna vista. Accesa senza conversazioni: vista con un testo vuoto.
- Spegnerla o passare alla chat di Cursor mentre delle conversazioni lavorano: finiscono il loro lavoro e la vista resta finché l'ultima non è chiusa.
- Interruttore nel gruppo Features, `trama.ompChat`, titolo omp Chat; con `trama.agent` su `cursor` è visibile ma disabilitato, con la nota «Only with omp».

## Assunzioni da controllare
- L'hook di Trama si passa a `omp acp` come al terminale (`--hook`), con la stessa identità di terminale, così annunci, Task presi, schede in attesa, rifiuto dello strumento di domande e controllo di esecuzione restano gli stessi. Va verificato con omp che le opzioni prima di `acp` arrivino alla sessione ACP.
- Il messaggio fisso della ripresa è in inglese: «The editor window reloaded and stopped your work. Continue it from where it stopped.».
- Un processo che finisce da solo chiude la conversazione anche con `trama.autoExit` spento, perché non c'è più un agente con cui continuare.
- Il modello scelto nel selettore vale solo per quella conversazione, dal turno seguente, e non cambia i ruoli dei Settings.
- Stop interrompe il turno come Esc nel terminale di omp; ciò che segue lo decide l'hook, come nel terminale.
- Con omp Chat in uso `trama.terminalLocation` non conta; la sua descrizione non cambia.
- Una sequenza per modello di Run all si ferma alla ricarica come oggi; solo il Run in corso può riprendere.
- Un ADR nuovo registra il ritorno di ACP per omp Chat, dopo ADR 0004, superato.
- Testi, icone e dettagli della vista (`ui#omp-chat`, `ui#omp-chat-conversation`) sono scelti dall'agente sul modello del pannello.
- Se la barra laterale secondaria non si può dichiarare con la versione minima dell'editor, la vista sta nel pannello in basso e il developer la sposta.

## Already present
- `panel/Closed/developer.SHOW_SETTINGS` — `extension/src/host/controller.ts` (`openSettings`, `pendingView`)
- `panel/Open/developer.SHOW_SETTINGS` — `extension/src/host/controller.ts` (`openSettings`, messaggio `navigate` con `view: "settings"`)
- `panel/Closed/developer.OPEN_GUIDED_SETUP` — `extension/src/host/controller.ts` (`openSettings` con `guidedSetup`, `pendingGuided`)
- `panel/Open/developer.OPEN_GUIDED_SETUP` — `extension/src/host/controller.ts` (`openGuidedSetup`)
