---
column: done
technical: false
refs:
  - chat-advisor
  - agent.ADVISOR_REVIEWED
  - requirements/rules#chat-advisor
  - requirements/cli#General
drift: null
proposal: n97kq4ls
agent: false
created: 2026-10-21T11:33:12.145Z
finished: 2026-10-21T11:54:08.496Z
---
# Advisor della chat nell'host

L'Advisor della chat vive nel registro dei lavori della finestra (`extension/src/host/drift-resolution.ts`), legato al lavoro del Run e alla sua conversazione, e segue la Machine `chat-advisor` per ogni agente guardato: l'agente principale da quando il Run (Task, `Run all`, Run di sequenza) con Advisor Scanner attivo è legato alla conversazione; un sotto-agente da quando porta un Task in In progress (mai `trama-advisor` né sotto-agenti senza Task). Non esiste in design, scan, import, Resolve Drifts né con omp.

Per ogni agente tiene in memoria stato, richieste fatte (ognuna con identità nuova; esiti di richieste non più attive ignorati), note in attesa e ultima fotografia dei file; nulla su disco, tutto perso se l'editor riparte. Testi inglesi esatti di `rules#chat-advisor`: revisione continua in background (al più una per agente; le modifiche nel frattempo vanno alla successiva), consegna delle note al prossimo strumento dello stesso agente insieme alla richiesta per le modifiche arrivate nel frattempo, revisione del Task alla fine del sotto-agente e revisione finale alla fine del turno dell'agente principale, ognuna seguita da note non consegnate e file non rivisti, al più tre volte; dopo un esito pulito o la terza richiesta niente più continuazione. Una revisione del Task o finale rende irrilevante la continua in corso. Una versione di Cursor che non consegna `additional_context` non è segnalata. Gli esiti che chiudono la corsa senza revisione finale passano il motivo all'avviso della Board.

`agent.ADVISOR_REVIEWED`: nuovo comando `trama advisor review --input -` (`src/cli/commands/advisor.ts`) con `{ review, clean, notes? }` (`notes` non vuoto obbligatorio se `clean` è `false`, rifiutato se `true`); manda l'esito alla finestra sul canale locale delle domande e stampa in una riga che è arrivato o che l'editor non lo aspetta più (uscita 0, anche senza editor); input non valido è errore d'uso (uscita 2) e non manda nulla; nulla sotto `.trama/`. `drift list` accetta `{ all?, refs?, job?, currentJob?, unprepared? }` come in `requirements/cli/main.md`.

Il sotto-agente `~/.cursor/agents/trama-advisor.md` è scritto, riscritto e confrontato come `trama-analysis.md` (`src/core/sub-agents.ts`), front matter `name`, `description`, `model` (`trama.scan` citato o `inherit`), senza `readonly`; corpo inglese: leggere Task, Proposal e riferimenti con comandi di sola lettura, leggere i file nominati, note e Drift secondo `rules#work` (codice del Task → note; codice preesistente → Drift), finire sempre con `trama advisor review`; seconda definizione in background se Cursor non lascia scegliere il background per chiamata. Skill `trama-implement`: sezione per l'Advisor Scanner nella chat di Cursor (saltare pre-flight e scansione mirata, eseguire subito ogni testo che inizia con `Trama's Advisor`, avviare `trama-advisor` come chiede, dirlo ai sotto-agenti). Aggiornati `docs/cli.md`, `README.md`, `extension/README.md`, `CHANGELOG.md`.
