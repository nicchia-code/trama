---
created: 2026-10-21T10:47:27.060Z
updated: 2026-10-21T10:47:27.060Z
summary: "Nuova impostazione sperimentale Context Sharing: con essa accesa l'agente passa ai sotto-agenti ciò che ha già letto; le skill di Resolve Drifts esplorano con al massimo N sotto-agenti (20 se non detto)."
tasks:
  - 3nv60bq4
  - pjail4qt
  - s1uin20z
cleared:
  s1uin20z:
    title: Frase e skill Context Sharing
    proposal: wiedlugb
    tag: Context Sharing
    finished: 2026-10-21T10:46:03.933Z
    refs:
      - agent-launching
      - requirements/rules#agent-launching
      - requirements/quality#agent-launching
  pjail4qt:
    title: Impostazione Context Sharing
    proposal: wiedlugb
    tag: Context Sharing
    finished: 2026-10-21T10:42:58.399Z
    refs:
      - panel/Settings
      - panel/Closed/developer.SHOW_SETTINGS
      - panel/Open/developer.SHOW_SETTINGS
      - requirements/ui#panel/Settings
      - requirements/tech#panel/Settings
      - requirements/ui#agent-launching
  3nv60bq4:
    title: Resolve Drifts fino a N
    proposal: wiedlugb
    tag: Context Sharing
    finished: 2026-10-21T10:42:52.356Z
    refs:
      - requirements/tech#proposal
---
# Context Sharing sperimentale

Context Sharing è una funzione sperimentale spenta per impostazione predefinita: `trama.experimentalContextSharing` è dichiarata nel manifest, mostrata come `Checkbox` nel gruppo Experimental di Settings e letta solo dal valore utente con `configuredContextSharing`. Con l'impostazione accesa, ogni istruzione che porta il limite dei sotto-agenti aggiunge la frase di Context Sharing, e le skill `trama-design`, `trama-scan`, `trama-compare`, `trama-implement`, `trama-import` e `trama-resolve-drifts` hanno la sezione "Experimental context sharing" che dice cosa passare a ciascun sotto-agente (testi di Trama citati tali e quali e posizioni nel codice, mai il codice). La descrizione di `trama.maxParallelAgents` copre ora scan, design, Resolve Drifts e Run. La skill `trama-resolve-drifts` non ha più il limite fisso di quattro sotto-agenti: esplora con al massimo N insieme, come `trama-design`.
