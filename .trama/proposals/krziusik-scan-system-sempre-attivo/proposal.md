---
status: approved
base:
  editor-panel/menu-laterale.md: fb6b440ef6b339d8bf4eb31bedeac3e277fdc7906f5b339ca39353b1e47119d7
  editor-panel/panel.md: 48b9090e3b616829b2dcd5151f731bde2b45e9c52bad78f4b7a9f69fc511d76f
  agent-launching/feature.md: 9e7c34a4a169dd383000a3dc7d7aef559eaa39cf20127dd87b63d335c671ebd2
  work/task.md: 4f84bfc9e2b87635cb0738a43365ce3ff00f7de8304b8a184eed47ab6addbbda
  requirements/rules/scans.md: 5351ece78e47f17dfeeecfe13ba72c068aaf97467eba9a8c9e176c269c3eab60
  requirements/rules/agent-terminal.md: 946d306aca2d87e13a2599b38b5bf4675c16aa49280636ca0087ceb71bd8c854
  requirements/rules/announcements.md: d3474ab247b0d6d1ca1c58d105179d814d49dcc2239be1e1306ec533efc20e08
  requirements/rules/models.md: b2ab2cba98f7ebad845c4fdfcea9f15c0249d29bab97377df770101815544c9e
  requirements/rules/drift-resolution.md: 29c438fd61c7b03e8feb8f51c1f89cd802e0ed50692800ec68f527d18e8d6958
  requirements/rules/instruction-files.md: 7b081436900e871b0286480c981ce4784b4a3340c1329d7800ae8387e31d808c
  requirements/ui/panel.md: f801c6231f37123f100287f3b3add29c9e4697f5bad6cf8e6117b3d48d3d5307
  requirements/ui/menu-laterale.md: 08023023374e3bb82d6451de23010096ac6ede0fcb6b5548f2d51c58fabdc78f
  requirements/ui/settings-specs.md: 4b6c3a05855e43124369bfb41f7ed01b32de2f81ce30e3f702c47c14ea4b7bf3
  requirements/tech/menu-laterale.md: 42812e6a827dda54b4ecffdbdb6135097b466d2c82ad80a5dac759d31d5fd4cc
  requirements/tech/settings.md: 2824c551c9ec5eb91a4ff072804df2dad86d493d936d1071d3544f3573ef7e8c
  requirements/data/work.md: ece3db35d6714c6521ea6f6882d145c6a004d9712ebf06f96df0ca7038d8e315
  requirements/tech/work.md: f4361408668d306c9ae39972739599d78c2c8addc3cab7c8694bce9844f34f16
delete: []
request: 2026-10-24T18-50-02
created: 2026-10-24T16:57:53.366Z
label: Scan System
---
# Scan System sempre attivo

Il pulsante Scan System del menu laterale (barra delle attività) deve lanciare lo scan di tutto il Sistema anche con l'Advisor Scanner acceso, e diventa l'unico punto da cui Trama lancia uno scan.

Decisioni:
- Con l'Advisor Scanner acceso, Scan System del menu laterale resta attivo e lancia lo scan di tutto il Sistema come con l'Advisor Scanner spento.
- Gli altri ingressi degli scan spariscono: il pulsante Scan del Diagramma, a ogni livello (Sistema, Whole System, Actor, Feature), e il comando dell'editor `Trama: Scan System`. Trama non lancia più scan di una sola Feature; l'agente può sempre scansionare una Feature quando il developer glielo chiede in una conversazione.
- Con l'Advisor Scanner acceso Scan System mostra il numero `· N` dei Task finiti dall'ultimo scan globale, e lo scan aggiorna il ricordo dell'ultimo scan come con l'Advisor Scanner spento.
- Con l'Advisor Scanner acceso Scan System chiede la stessa conferma di sempre prima di lanciare lo scan.
- L'Advisor Scanner spegne soltanto il pre-flight e la scansione mirata di fine corsa dei Run; la riga «Scan is off during Runs.» e il rifiuto delle richieste di scan spariscono.
- La descrizione dell'impostazione Advisor Scanner diventa «On: during every Run an advisor, using the Scan model, checks the code against the Model and files Drifts instead of the Run's own scans. Scan System still works.»

Assunzioni (non chieste):
- Lo scan lanciato da Scan System con l'Advisor Scanner acceso è uno scan normale: nessun advisor, nessuna frase dell'Advisor Scanner nell'istruzione, come oggi fa il codice per ogni lavoro che non è un Run.
- Il Diagramma resta senza alcun pulsante che avvia l'agente; nessun rimando al menu laterale al posto di Scan.

Rifinitura sul Modello attuale:
- `editor-panel/panel.md` riscritto sulla versione attuale, che ora contiene la sezione Providers della scheda Settings e la Transition `developer.LOG_IN_PROVIDER` → Settings: restano intatte; la Proposal cambia solo le descrizioni di Open e Diagram come prima.
