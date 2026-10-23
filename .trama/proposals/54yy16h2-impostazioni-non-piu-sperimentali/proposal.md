---
status: approved
base:
  editor-panel/panel.md: 5e8ccb5bf0fbc7c1dcbe11ec2abd51a68d5dbbd85bf354414f9c4eca3f9d8e76
  work/drift.md: 994b89f7ae71ab276645acd2ee68301104952e4d003b28ddccc77084e09f3315
  work/task.md: 279243a3198012757e2b67cdf4cecdd44ab4075d1b3293edd340998c6b0497ea
  agent-launching/feature.md: 9b90f1c86d0298f2a2604b692f561df5b6904959b06de2f5727be0d6543a4c8b
  agent-launching/drift-resolution.md: f7e1751afdc8a16a18b893feb8bdbaa855920dd1b1efae17acffa905c47296d5
  agent-launching/agent-terminal.md: a48407fcc01b221c529964905d45e2f0a9650134769aa5b574716d9c0348d65a
  project-setup/setup-wizard.md: be0104183192a7a8a7203646c6c9699c5db29082d0b12e80c899e106e677a4e4
  model-changes/proposal.md: 4dd114ad48af0c74cc8ec1e322afe402a02630daf7cf2b2cd6c3fba9e7cd867f
  requirements/tech/drifts.md: 69a899fa813127dedc1441aa0c2f2985b544eea6c37e356d31a112ded8960877
  requirements/tech/drift-resolution.md: 63fc482e97f722a86a5c8c840cfc0166a30fed1cd0b668434eab5d61e6d1b81d
  requirements/tech/agent-terminal.md: 579c3c9866e7d90f082cd64c1e2a7d9dd5e350a14b4040584480b273863cac0d
  requirements/tech/settings.md: 6477ab77090f991d661e665a46903c316889c435ed4037c1758805dc2fe976e9
  requirements/tech/scans.md: 16392f254bf517555c05c0c33d810d64756a1fa82ebf850ddbd266bf2093725d
  requirements/tech/work.md: a7d190d0315ad0e49d41bec47638e83ba5693c12a88df21d91c61c92cc0b28a9
  requirements/rules/unify-drifts.md: 79afd35cef8ee6490d86cb5110a114aea4e3ae30499e93b2a3fd884f2d9d95b7
  requirements/rules/setup-wizard.md: ca54847fa9bb26e6526c216a7546968fd7dfabae6a609f978b8b9ea85297b515
  requirements/rules/rework.md: 87c42fb1316c203ebed8e402fbcaa6f24d6e0e1f93b2612e4888fbb8cf6e479a
  requirements/rules/scans.md: 0c895dacad60a51417c408c407092dcc2aa347a425cdffe5cb71c46200b43146
  requirements/rules/drifts.md: 6dcf6dcb4154855c4515679c0456efa3a427c2280f9f15f6b0fbe0e6e2c654d5
  requirements/rules/models.md: ab8c6a9ab7caee520a9cee7fa96714153de5bb578a28b141426f35554f73e260
  requirements/rules/drift-resolution.md: ceb71f54887e78cb8004226fab3753a18aa914ce4cdfe8f33ee1ffc32ae4793c
  requirements/rules/agent-terminal.md: 1f9484beaf2f5df52230a096bff9b09b9d081c41adf371082da3404f9dddca1b
  requirements/rules/quick-task.md: 78ecdc6e79ed1066d50cd08700729a6f596ae7e20e8f3141dec7f9bcebd135ab
  requirements/rules/tasks.md: d11fea824a831c0fac79b00d3b8748b3366b35fcbad64dd30a7be5bc98210177
  requirements/data/proposals.md: 539607576c53f37f1885a95eed8b791acaf8a7761be22396d7e068c78f5e374e
  requirements/quality/agents.md: 2381c0fbe85eb1670815fb1653fcf845742f66b6f6d337d2feb00988d58d8b23
  requirements/quality/main.md: a53be089f20d68595f2a5dd2f1d4761c963dfee673fa64beff34c1bb161f9af6
  requirements/cli/main.md: 50edc674f694330d3d37b948f310b25acab9e864f08b793fca70a3b4222baace
  requirements/ui/board.md: d26da753408d361c0886815ad2d7969ede683c340ff3be6b23eb6432c4013b0c
  requirements/ui/settings-specs.md: 03d9236303749bcb848865bffce09ac57e566dc06e61d5b6a58a026043470069
  requirements/ui/get-started.md: 70e626b8871d2825cb42b1684bfdb0724a437b757db9abf9653ddaa97188dad3
  requirements/ui/agents.md: 5c211cf267a954079fb755bea6ba218825d10931789c3e2dc03888d8a29255d9
  requirements/ui/work.md: a02d26fdd33482d23a08538b511f08be8a81dc9761fc6d5e385eb2cfddc4c80a
delete: []
request: 2026-10-23T09-49-24
created: 2026-10-23T08:01:01.632Z
label: Settings edits
---
# Impostazioni non più sperimentali

Il gruppo Experimental della scheda Settings non raccoglie più funzioni sperimentali: Submit While Running sparisce insieme alla sua funzione, e le altre cinque impostazioni prendono un nome senza «experimental» e stanno nel gruppo Features.

Decisioni prese con il developer:
- Submit While Running (`trama.submitWhileRunning`) è tolta, impostazione e funzione: `Run all` e il Run di un Task sono sempre indisponibili mentre un Run lanciato da Trama non è finito, come oggi con l'impostazione spenta. Quick Task, scan, design, import e Resolve Drifts restano possibili durante un Run.
- Experimental Drift Blocker non si toglie: si rinomina `Drift Blocker`, chiave `trama.driftBlocker`, come le altre.
- Chiavi nuove senza migrazione: `trama.driftBlocker`, `trama.advisorScanner`, `trama.parallelExecution`, `trama.asyncDriftResolver`, `trama.subagentsContextSharing`. Un valore rimasto sulle vecchie chiavi (e su `trama.submitWhileRunning`, utente o workspace) è ignorato e non riscritto: chi aveva acceso una funzione la riaccende a mano.
- Titoli: `Drift Blocker`, `Advisor Scanner`, `Parallel Execution`, `Async Drift Resolver`, `Sub-agents Context Sharing` (quest'ultimo è un titolo esplicito, perché non si ricava dalla chiave).
- Il gruppo `Experimental` diventa `Features`, stesso posto e stesso ordine; il passo Advanced del wizard dice «Theme and optional features. You can skip this step.».
- «Experimental / sperimentale» sparisce ovunque per queste funzioni: descrizioni delle impostazioni, Modello, frasi delle istruzioni, titoli delle sezioni delle skill, tooltip del badge `blocks nothing` e aiuto di `trama timing new`.
- Tutte e cinque restano spente per impostazione predefinita.

Assunzioni da controllare:
- La richiesta nomina «Experimental Modern Parallel Execution»: nessun titolo contiene «Modern», quindi si tratta di `Experimental Parallel Execution`.
- Le frasi nuove delle istruzioni sono "The Drift blocker is on: …", "The parallel execution is on: follow the \"Parallel execution\" section of the trama-implement skill." e "The sub-agents context sharing is on: … as the \"Sub-agents context sharing\" section of your skill says."; le sezioni delle skill prendono gli stessi titoli («Drift blocker», «Parallel execution», «Sub-agents context sharing»).
- Il caso Y1 di `docs/uat.md` si riscrive come verifica che il Run resta indisponibile durante un Run; le voci vecchie del `CHANGELOG.md` restano, se ne aggiunge una nuova.
