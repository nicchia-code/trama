---
column: done
technical: false
refs:
  - announcement
  - agent.DECLARE_ANNOUNCEMENT_NOTE
  - requirements/rules#agent.DECLARE_ANNOUNCEMENT_NOTE
  - requirements/data#agent.DECLARE_ANNOUNCEMENT_NOTE
  - requirements/cli#agent.DECLARE_ANNOUNCEMENT_NOTE
  - requirements/tech#agent.DECLARE_ANNOUNCEMENT_NOTE
drift: null
proposal: sk8koj3a
agent: false
created: 2026-10-22T08:48:46.462Z
finished: 2026-10-22T08:53:36.282Z
---
# Note sugli annunci

L'agente può dichiarare una nota su un annuncio in attesa (Event `agent.DECLARE_ANNOUNCEMENT_NOTE`), e le skill gli dicono quando farlo.

Quando il Task è finito:
- `trama announcement edit [<id>]` con `{ note }` salva la nota: con l'identità solo su quell'annuncio, confronti compresi; senza, su ogni annuncio in attesa dello stesso terminale o della stessa conversazione della chat di Cursor, tranne i confronti; senza annunci lo dice ed esce con 0.
- La nota è ridotta a una riga; oltre 120 caratteri si salva troncata con `…` e il comando lo dice. Ogni annuncio tiene al massimo 6 note con il loro istante, la più vecchia esce per prima, e due note uguali di seguito contano una volta.
- Una nota non cambia fase, titolo, `touched`, legame con la Draft né consegna o ritiro, in ogni sotto-stato di Announced (Preparing, Writing, Verifying, Scanning, Aggiornamento della History, Comparing, Al lavoro), e non conta come lavoro dell'agente.
- Il file dell'annuncio porta `notes` e il quadro della Board porta `notes` e `announced` per ogni annuncio, come dice `data#agent.DECLARE_ANNOUNCEMENT_NOTE`.
- Le skill `trama-design`, `trama-setup`, `trama-scan`, `trama-implement`, `trama-import`, `trama-resolve-drifts` e `trama-compare` dicono quando dichiarare una nota e come scriverla; `docs/cli.md`, i README e il `CHANGELOG.md` lo descrivono.
