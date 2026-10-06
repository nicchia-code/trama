---
status: approved
base:
  agent-launching/agent-terminal.md: 866684d20613afe54e755f4443b88d3daae81552af696c6fe8d808dc72a19f99
  work/task.md: 3dd5fdc9bd189be44a42be4cd6759a2f1bb7c82541dd2c97edd1e241b605f871
  requirements/rules/tasks.md: 2fe8c6edd01bf90366ae1c8e68c5d448a77f314c3336f6c6e5183e64415f7dc0
  requirements/rules/decisions.md: 1c4be3cc16a183d1d293ed8ad9301a71d44aa379c328fe84f202cd5ab3987f0e
  requirements/rules/agent-terminal.md: cfe71d41e8c623152fc397622dd7d0553fcac82d675ab47e6868ce5a3406679e
  requirements/rules/worktrees.md: 0d98355d71b666a2c359ca56d5ce7a0a5f876ed1756cfe1c8543c88d3cd78f19
  requirements/tech/work.md: 3f1ef310be6396686a7ead0b1ada4cb76b96afeadd45d4286d5eaed4346ab9de
  requirements/tech/agent-terminal.md: 7c08b7bdbc78b892cbd330ef55bd0038172e6abdc09603ba72f571954da1d858
  requirements/tech/general.md: ff70a521cf227d2613003f0a38f3c501ac9728ea722dc86354429bcbcb670968
  requirements/quality/main.md: d99b12e21641490bf5e2b006f444a282e735d27aaac9ba7c50d5511a50008a6c
  requirements/ui/agents.md: 286adb888ce73a6e77fb98dd7bf711678c084c02e4191404b8e6546f411deb09
  agent-launching/feature.md: 58a34bde7ffe418300c235b266c5819b9745f4a7bca4059874cd6db120c62d04
  requirements/data/work.md: 710b259d2b3df410e7017f5c39297d91c5c4c40c0852d376bdcad58327b4eb63
delete: []
request: 2026-10-06T12-22-22
created: 2026-10-06T10:37:30.454Z
---
# Faster agent runs: targeted scans, sub-agents and chained implementation

Il sistema è lento perché ogni corsa dell'agente è sequenziale e la scansione dopo l'approvazione rilegge Feature intere. Questa Proposal riduce il lavoro e lo parallelizza nella stessa cartella, senza worktree.

Decisioni prese nell'intervista:
- Parti lente: implementazione dei Task, scansione dopo l'approvazione, attese tra le fasi, design. La riga di comando risponde in 0,1–0,25 s e resta com'è.
- Parallelismo con i sotto-agenti dell'agente, nella stessa corsa; un agente senza sotto-agenti resta sequenziale.
- Trama sceglie i Task da eseguire insieme: `trama task next --batch` dà fino a 4 Task eseguibili che non riguardano la stessa cosa fra loro.
- Al massimo 4 sotto-agenti insieme.
- La scansione usa un sotto-agente per Machine.
- La scansione automatica dopo l'approvazione guarda solo ciò che la Proposal ha cambiato: elementi del Modello e sezioni dei Requisiti cambiati, con ciò che contengono, più le Transizioni che vi entrano.
- Alla fine di ogni corsa di implementazione (design, Task singolo, Run all To do) che ha realizzato almeno un Task e non lascia Task bloccati, lo stesso agente fa uno scan globale di tutto il Sistema, dopo test, lint e build.
- I Task dello scan globale sono legati al design della corsa, se c'è, e restano in To do: la corsa li riporta e si ferma.
- Dopo la scansione automatica senza Drift lo stesso agente prosegue con i Task appena archiviati; impostazione propria `trama.autoImplement`, accesa di default.
- Design: l'esplorazione iniziale va ai sotto-agenti in parallelo.
- Nei worktree del multi-branch: scansione mirata e sotto-agenti sì; catena e scan globale no (c'è già il controllo dopo l'unione).

Ipotesi mie, da controllare:
- Uno scan globale dopo Run all To do o dopo un Task senza design archivia Task senza design; dopo un Task singolo di un design li lega a quel design.
- Se la scansione automatica archivia un Drift, anche con Proposal, la catena non parte e lo dice nel resoconto.
- Una scansione avviata a mano non prosegue mai con l'implementazione.
- Lo scan globale parte solo se anche la verifica finale di test, lint e build passa.
- L'ambito di scansione si calcola all'approvazione (o all'ingresso nel worktree), si salva nella Proposal (`scanScope`) e l'agente lo legge in `## Scan scope` di `trama proposal show`: dopo l'approvazione il Modello di prima non c'è più.
- Una descrizione cambiata di Machine, Feature o Actor entra nell'ambito da sola, non con tutto ciò che contiene; una Machine nuova entra intera; un elemento tolto entra con il contenitore più vicino; una sezione General cambiata entra da sola.
- Il limite di quattro sotto-agenti vale anche per scansione e design.
- I sotto-agenti non eseguono suite intera, lint, build né scansioni; i conflitti fra file li scopre la verifica finale.
