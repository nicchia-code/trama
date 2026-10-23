---
column: done
technical: false
refs:
  - agent-launching
  - developer.ASK_MORE
  - requirements/rules#agent-terminal
  - requirements/rules#developer.ASK_MORE
  - requirements/tech#developer.ASK_MORE
drift: null
proposal: x6bguwt0
agent: false
created: 2026-10-23T09:50:00.125Z
finished: 2026-10-23T10:07:49.956Z
---
# Lancio di Ask more

Quando questo Task è finito, l'host dell'estensione sa aprire una chat di Ask more su una Proposal, un Task, un Drift o una domanda di un round, con l'agente scelto in `trama.agent`, e i messaggi del webview che la chiedono arrivano e sono gestiti. I pulsanti nelle modali della Board e nell'overlay delle domande sono Task separati della stessa Proposal: questo Task fornisce il messaggio `askMore`, la costruzione del prompt e il lancio.

Cosa deve valere (`developer.ASK_MORE`, Feature `agent-launching`, Machine `agent-terminal`):
- Ogni clic apre una chat nuova, mai riusata; più Ask more possono essere aperti insieme. Ask more è sempre disponibile: non è un Run, non è una risoluzione, non registra nessun `JobKind`, non è mai rifiutato per un altro lavoro, un round aperto o una scheda in attesa della fine del turno.
- Modello: `trama.analysis` (tolti gli spazi; vuoto = predefinito dell'agente), mai il modello di una Proposal.
- Istruzione: il testo fisso nuovo `extension/media/ask-more.md`, in inglese, che comincia con la riga `Trama: Ask more`, seguito dalla parte che descrive la cosa scelta, letta dai file (o, per una domanda, dalla `QuestionSession` in memoria) al momento del clic. Il testo fisso chiede all'agente di leggere ciò che gli serve con i comandi elencati, dire che è pronto e aspettare la domanda del developer, spiegare; sistemare schede solo su richiesta del developer e solo con i comandi di Trama esistenti (`trama proposal edit` + `trama proposal move <id> open`, `trama drift new` per unificare, `trama drift edit`); mai scrivere a mano in `.trama/`; quando nessun comando lo permette (per esempio cambiare un Task già creato) dirlo e indicare la via di Trama (richiesta di design con `+ Add Work Item`, `Resolve`, `Rework with feedback…`); non prendere decisioni (approvare, rifiutare, scartare, risolvere Drift, riprendere Task) senza richiesta esplicita.
- La parte, con identità permanenti, è descritta per tipo in `rules#developer.ASK_MORE`: Task (corpo, riferimenti, immagini, Proposal e Drift d'origine), Proposal (stato, corpo, Task, Drift risolti con la decisione), Drift (due lati, riferimenti, Not blocking, Proposal allegata, Task d'origine, Drift precedente, Drift uniti), ciascuno con i comandi `trama task show`, `proposal show`, `drift show`, `model show`. Per una domanda: la domanda in vista per intero (testo, contesto, opzioni con descrizione e dettagli, raccomandata, multipla), poi testo e opzioni delle altre domande del round, mai scelte, risposte scritte o salti; per la domanda pronta di un Drift l'identità del Drift. La parte dice che il round è aperto e che l'agente non risponde al posto del developer.
- Frasi aggiunte: solo quella della lingua e, nella chat di Cursor, la riga del `PATH`; nessun'altra frase delle istruzioni (né quella delle domande).
- Con omp: terminale nuovo come il Quick (`tech#developer.OPEN_QUICK_TASK`), chiamato `Ask <numero breve>` (`Ask T3`, `Ask P2`, `Ask D1`) o `Ask question`, che prende il focus, senza hook; riga `omp [--model <m>] @<testo fisso> <parte>` citata per la shell, senza `--hook`, `--config`, `--slow`, `--advisor`; ghost di lavoro con il nome del terminale, che finisce come il ghost `Quick`.
- Con la chat di Cursor: `openCursorChat` con i tre passi di sempre (invio automatico, collegamento, appunti) e il modello di analisi, senza `startJob` né annuncio; fuori da Cursor appunti e avviso di `ui#agent-terminal`. La conversazione non diventa di Trama: `SKILL_PROMPT` non cambia.
- Nulla del round si scrive su disco.

Test come in `tech#developer.ASK_MORE` (host con terminale finto, chat di Cursor, `prompts.ts`, riconoscimento della conversazione).
