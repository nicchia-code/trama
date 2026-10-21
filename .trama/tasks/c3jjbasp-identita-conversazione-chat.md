---
column: done
technical: false
refs:
  - editor-chat
  - requirements/tech#editor-chat
  - requirements/quality#editor-chat
  - requirements/tech#work
drift: null
proposal: n97kq4ls
agent: false
created: 2026-10-21T11:33:12.145Z
finished: 2026-10-21T11:44:33.969Z
---
# Identità della conversazione

Ogni conversazione di Trama nella chat di Cursor conta come un agente a sé, come un terminale di Trama: ciò che il suo agente registra appartiene a quella conversazione e al lavoro che Trama le ha affidato.

Quando il Task è fatto:

- `trama hook cursor` ha una voce `preToolUse` in più con il `matcher` della shell di Cursor (`Shell`), scritta e riconosciuta da `writeCursorHooks` (`src/core/cursor-chat.ts`) come le altre voci di Trama. Per una riga che non lancia `trama` risponde subito `{}` senza leggere nulla. Per una riga che lancia `trama` legge il file di stato dell'editor (vedi `tech#chat-advisor`) e, se la conversazione è di Trama, risponde con `updated_input` che premette al comando `TRAMA_CHAT=<conversazione> TRAMA_JOB=<lavoro> ` (senza `TRAMA_JOB` se la conversazione non ha un lavoro), citati per la shell, senza concedere approvazioni che Cursor chiederebbe. In un sotto-agente la conversazione è sempre quella principale, risalita dalle chiamate registrate a `subagentStart`. Senza file, senza la conversazione o con un errore il comando parte com'è.
- La riga di comando legge `TRAMA_CHAT` (accanto a `agentVariable` in `src/cli/main.ts` e a `originFromEnv` in `src/core/announcements.ts`): con `CURSOR_AGENT=1` e `TRAMA_CHAT` la provenienza è `{ chat: "cursor", conversation }` e `TRAMA_JOB` vale come nel terminale (`jobFromEnv`, `src/cli/context.ts`); senza `TRAMA_CHAT` resta la chat del progetto, come oggi. `TRAMA_CHAT` senza `CURSOR_AGENT=1` non vale come agente.
- Ogni istruzione che Trama manda alla chat ha un'identità di lavoro, come quella del terminale, legata dall'host alla conversazione che quell'istruzione apre (`extension/src/host/drift-resolution.ts`); una conversazione aperta a mano non ha lavoro.
- `stop` con `completed` è `TURN_FINISHING` e, quando l'host non continua il turno, subito dopo `AGENT_STOPPED`. `AGENT_STOPPED`, `AGENT_INTERRUPTED` e `CONVERSATION_CLOSED` di una conversazione rilasciano i Task presi, ritirano gli annunci e liberano le schede in attesa di quella conversazione e della chat del progetto senza conversazione, mai quelli di un'altra conversazione (oggi `releaseTakenTasks({chat:"cursor"})` ed `endFiledWork("cursor")` in `extension/src/host/agent.ts`). Un sotto-agente non è una conversazione a sé e la sua fine non è la fine del turno.
- Tempi delle fasi: ogni registrazione porta anche la `conversation` quando c'è, e il titolare di un file dei tempi (`recordTiming`, `src/core/timings.ts`) è il terminale, la conversazione o, senza, la chat del progetto: due conversazioni non scrivono mai nello stesso lavoro, e `trama timing new` registra le scelte dell'esecuzione parallela nel lavoro della sua conversazione.
- Qualità: gli hook frequenti rispettano i limiti di `quality#editor-chat` (nessuna lettura per i comandi che non lanciano `trama`, solo il file di stato per le conversazioni che non li riguardano, un secondo per l'editor, cinque per `stop` e `subagentStop`), all'editor arrivano solo identità e percorsi relativi, e lo smoke test di accettazione di ogni nuova versione di Cursor controlla `TRAMA_CHAT` e `TRAMA_JOB` sui comandi `trama` senza approvazioni saltate.
