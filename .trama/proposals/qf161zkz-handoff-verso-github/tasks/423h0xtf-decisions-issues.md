---
refs:
  - panel/Team
  - panel/Closed/developer.SHOW_TEAM
  - panel/Open/developer.SHOW_TEAM
  - menu-laterale
  - requirements/ui#proposal/Open
  - requirements/ui#issue
  - requirements/ui#menu-laterale
  - requirements/ui#panel/Team
---
# Schede Decisions e Issues

La vista Team ha le schede `Decisions`, `Issues` e `People`, in quest'ordine, e si apre su `Decisions`. Quando il Task è finito:

- Testata della vista: titolo `Team`, sulla stessa riga il pulsante del GitHub Project e a destra `Updated …` e `Refresh` (dal Task `GitHub Project e lettura con gh`); sotto i 480 px il pulsante del Project va sotto il titolo.
- Menu laterale: la voce `Team` porta un `Badge` con il numero di handoff aperte quando non è zero, nome accessibile `Team, N handoffs wait for a decision` (`1 handoff waits…`); le handoff non contano mai nel numero di `Board` né nel badge dell'icona. Il quadro della Board e `menuState` portano le handoff aperte e il loro numero.
- `Decisions` (`ui#proposal/Open`): intestazione `Waiting for your decision`, `Approving publishes the issues on GitHub` e il pulsante `New handoff` che apre una richiesta di handoff; il numero delle handoff in attesa come `Badge` sull'etichetta della scheda. Una card per handoff aperta (mai Draft) con numero breve, titolo, chip dell'epica col punto colorato, `Creates <n> issues · changes <m> Machines · proposed <tempo fa>` (`changes nothing in the Model` senza file), avvisi `<n> warnings`, motivi di blocco, `Approve` e `Reject` split con `Rework with feedback…`; `Approve` disabilitato con `The agent is still finishing`, con il primo motivo di blocco o con `Link a GitHub Project first`. Vuoto: `No handoff waits for a decision` con `New handoff` e `View published issues`.
- Anteprima delle issue: barra con `Decisions` (indietro), numero e titolo della handoff, `<i> of <n>` con `Previous issue · Alt+↑` e `Next issue · Alt+↓`, Approve e Reject; Esc torna alle card. Pill `Not published`, `New issue in <owner>/<repo>`, titolo, chip delle etichette, riquadri degli avvisi (`Estimated <n> d: more than 3 days per issue.` con `Split`, `Not covered: <ref>.`). Corpo composto (`rules#issue`) nel riquadro `Trama agent · drafted from handoff <P> · preview of the GitHub issue body`, reso con il renderer Markdown del pannello, diagrammi `mermaid` compresi, e il blocco richiudibile `Trama references` con i chip dei riferimenti. Colonna dei campi: `Assignee`, `Reviewer`, `Estimate (days)`, `Sprint` e gli altri campi del Project nel loro ordine, ciascuno con `Proposed by the agent` o `Changed by you · Undo`; salvataggio alla scelta o all'uscita dal campo, valore invalido con bordo distruttivo e messaggio. Sotto i 720 px corpo e campi uno sopra l'altro.
- `Issues` (`ui#issue`): `<n> issues in <m> epics · ordered by dependencies`; tabella raggruppata per epica con righe di gruppo richiudibili (`<n> issues · <giorni> d`), colonne `Issue` (`#<n>` o `–`), `Title` con `Publish failed: <reason>` o `Fields not set on GitHub: …`, avatar dell'assegnatario, `Sprint`, `Status` (`Publishing` con icona che gira, tolta con `motion-reduce`; `Not published`; `Open`), `Actions` (`Publish again`, `Open on GitHub`). Sotto i 640 px righe a blocchi. Vuoto: `No issues yet. Approve a handoff to publish its issues.`
- Messaggi `setIssueField`, `splitIssue`, `publishAgain`, `writeHandoffRequest` validati da `parseToHost`; Approve, Reject e Rework usano i messaggi di decisione esistenti, accettati per una handoff solo dalla vista Team.
- Logica pura (ordine, gruppi per epica, tempo fa, editor dei campi) in `extension/src/webview/team/logic.ts` con test senza DOM. Testi in inglese, non seguono `trama.language`; tutto da tastiera, stato detto anche a parole, contrasto AA.

Le immagini legate a questo Task mostrano testata, scheda Decisions, anteprima di un'issue e scheda Issues: sono il riferimento visivo; testi e regole esatti sono quelli dei Requisiti. Gli stati delle issue dopo la pubblicazione (in corso, in review, chiusa…) e i segnali arrivano con la Proposal della timeline.
