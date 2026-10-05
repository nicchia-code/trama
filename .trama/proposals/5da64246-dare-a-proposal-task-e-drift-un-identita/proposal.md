---
status: approved
base:
  actors/developer.md: 4b4c9aceff1db49913fe95fd8fd33dff4c7c780ba23f962e6b01e7d66d0a38b0
  project-setup/project.md: 401cd9a14d14797528b3cf9a55c557163c3f9a2ee64b6cc78a41e90059599b11
  project-setup/feature.md: 3783a1e7c6547b140e6d83031efbf16ad4822f7ca55df88453c8c3dabe70cf84
  model-changes/proposal.md: 1ea9fbac13f086b023f9d3d8a0ba3db767298ae9ad493a7479db88d84f38451c
  model-changes/feature.md: 8292ef74c0ebd1d2332acbc6eb53b0d917b40825df38c7218ee8f1e217cf3426
  work/task.md: c1f4baff11ec33c49ffc009103914fef2f5e1cf78a7bde0e9cbc4e9c51948d8b
  work/drift.md: 50829e6e90754550a899c8c896c7ce9139dcecc85203077b3f309af56a92ba19
  work/feature.md: fd3584bc1853d41333a50b0057f0d986f0946b071dfc38a19419799b27f2f266
  requirements/data.md: 5746fca648d128e5cf0ccf85f56fc3654322b4a62b5a5c44db80f2d4aaa678ef
  requirements/rules.md: 1bdfe5a3d07ca2288fea6e8effc99c8916afd8f4b32d50158676673969d21016
  requirements/tech.md: f2a8ead60522428450bb167a8dc4e5a66b09a4930278392c13108e712919fa4c
  requirements/ui.md: 503a507cb456a7c7a1fe37580a4eb0bd58504c37493d747fcdb5a1392c6b7140
delete: []
created: 1970-01-01T00:00:00.037Z
---
# Dare a Proposal, Task e Drift un'identità che non collide

Due branch, o due worktree, partiti dallo stesso punto assegnano oggi lo stesso numero. Al merge i file si pestano se lo slug coincide, e i riferimenti (`requires`, Proposal, Drift, Task, origine) non sanno più quale scheda intendono. Vale anche senza multi-branch.

- L'identità di una Proposal, un Task o un Drift nuovo è di otto caratteri casuali (lettere minuscole e cifre), unica per tipo, più lo slug nel nome. Non c'è un contatore.
- Se l'identità estratta è già usata in questa cartella da una scheda dello stesso tipo, se ne estrae un'altra. Lo scontro fra due branch resta un conflitto git.
- L'ordine è l'istante di creazione, il più vecchio prima; a parità di istante decide l'identità. Il prossimo Task eseguibile è il più vecchio fra i eseguibili.
- Una scheda ancora numerata resta leggibile. Fra le numerate l'ordine è il numero, e stanno prima di quelle che ricordano l'istante.
- `trama ids rewrite` riscrive tutte le schede numerate. È solo del developer, dalla riga di comando, senza pulsante nel pannello, e non crea il commit.
- L'identità nuova di una scheda numerata è calcolata dal tipo e dal vecchio numero, così due branch ottengono lo stesso risultato. L'istante che riceve conserva l'ordine dei numeri, non l'ora del comando.
- Il comando riscrive il nome e i riferimenti strutturati (Proposal richieste, Proposal di un Task, Drift di un Task, Proposal di un Drift, Task nato dal Drift, Task di origine). Non tocca il testo libero, il codice, gli annunci né i branch git.
- Si rifiuta senza cambiare nulla se un giro di worktree è aperto, se due schede dello stesso tipo condividono un numero, o se due identità nuove coinciderebbero. Se non c'è nulla da riscrivere, non cambia nulla.
- Una scheda si cita con l'identità, con un prefisso univoco o con il nome del file. Un argomento di sole cifre cita solo una scheda numerata.
- Il badge di un Task bloccato mostra l'id del Drift o del Task di correzione.

Scelte di costruzione, da controllare: `created` è una data e ora ISO 8601 in UTC; per una scheda riscritta vale i millisecondi dall'epoca pari al vecchio numero. L'identità riscritta sono i primi otto caratteri esadecimali dello SHA-256 di `tipo:numero` con il numero a quattro cifre. I controlli avvengono tutti prima di scrivere.
