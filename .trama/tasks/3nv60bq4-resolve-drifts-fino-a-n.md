---
column: done
technical: true
refs:
  - requirements/tech#proposal
drift: null
proposal: wiedlugb
agent: false
created: 2026-10-21T10:20:21.334Z
finished: 2026-10-21T10:42:52.356Z
---
# Resolve Drifts fino a N

Quando il Task è fatto, la skill `trama-resolve-drifts` rispetta quanto dice `tech#proposal`: "La skill `trama-resolve-drifts`, in `skills/` con le altre, legge ogni Drift nominato con `trama drift show` e la sua Proposal allegata con `trama proposal show`; esplora il Modello e il codice con sotto-agenti, al massimo N insieme con lo stesso N dell'istruzione (20 se l'istruzione non lo dice), quando l'agente li ha, come `trama-design`".

Nel sorgente `skills/trama-resolve-drifts/SKILL.md`, il passo 2 (Explore) non dice più "at most four at once": affida l'esplorazione ai sotto-agenti al massimo N insieme, dove N è il limite dato dalla frase dell'istruzione "Run at most N sub-agents at once." (già prevista per Resolve Drifts da `rules#agent-terminal`), e `20` se l'istruzione non ne dà uno, con la stessa formulazione del passo 1 di `trama-design` ("at most N at once, where N is the limit in Trama's instruction (`20` if it gives none)"). La sezione della domanda preparata, che esplora "as step 2 of Steps says", segue lo stesso limite. Il limite vale sia con Context Sharing sperimentale acceso sia spento.

Nessun altro testo in `skills/` dice ancora "four at once" (o un limite fisso di quattro) per Resolve Drifts. Si modifica solo il sorgente in `skills/`; le copie installate si aggiornano con Update skills. `CHANGELOG.md` ha una voce che descrive il nuovo limite.
