---
refs: [issue, requirements/rules#issue]
---

# Corpo issue in due parti

La persona che fa il lavoro non ha mai bisogno di Trama: tutto ciò che le serve è nell'issue. Trama presume che le persone del team lavorino con un proprio agente di programmazione, quindi l'agente scrive il corpo dell'issue in due parti, nella lingua chiesta dall'istruzione di Trama, come testo autosufficiente. I contenuti sono gli stessi di un corpo in una sola parte, solo divisi.

A lavoro finito vale quanto segue.

- La skill `trama-handoff` (punto "Body" e indicazioni collegate) istruisce l'agente a scrivere il corpo così:
  - **Parte per la persona**, per prima, con titoli `##`, in quest'ordine: `Context`, `Current behaviour` (omessa per un comportamento nuovo), `Expected behaviour`, `Acceptance criteria` come task list, `Out of scope`, `How to verify`. Contiene tutto ciò che serve per capire il lavoro.
  - Poi una riga con solo `---`, il titolo `## For the agent` scritto nella lingua del corpo (per esempio `## Per l'agente`), e la **parte per l'agente**, con titoli `###`, in quest'ordine: `Where in the code` (file, simboli, brevi estratti di codice e il contesto tecnico o i vincoli che servono solo a un agente), `State diagram` con un `mermaid` `stateDiagram-v2` della parte della Machine coinvolta quando l'issue cambia States o Transitions, e, solo per un assegnatario junior, `Suggested steps`.
  - La parte per l'agente non ripete mai i criteri di accettazione: dice di soddisfare quelli della parte sopra.
  - Tutti i titoli sono nella lingua del corpo; il livello dell'assegnatario regola il dettaglio di entrambe le parti, come oggi.
  - Il corpo nomina States, Events e file come sono nel codice, mai come riferimenti di Trama; il blocco ripiegato dei riferimenti Trama resta in fondo, dopo entrambe le parti, aggiunto da Trama come oggi (tranne con Solo mode attivo).
- Il commento di aggiornamento di un'issue (ASK_ISSUE_UPDATE) non è diviso: resta un solo testo breve per la persona.
- Non cambiano: la composizione del corpo da parte di Trama (`githubBody`, con le righe Reviewer/Depends on e il blocco `Trama references`), il formato dei file delle issue, i controlli del hand-over e l'anteprima nel pannello (Markdown semplice).
- Il test della skill che oggi cerca il testo "`Suggested steps` (only for a junior assignee" è aggiornato alla nuova formulazione.
- La documentazione che descrive le sezioni del corpo dell'issue (`README.md`, `extension/README.md`, `docs/`) e il `CHANGELOG.md` sono aggiornati.
