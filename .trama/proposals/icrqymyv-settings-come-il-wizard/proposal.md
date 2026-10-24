---
status: approved
base:
  editor-panel/panel.md: 11e5d997534744eef4a71130b1cb0a0ece7f479c34a11c3652e76b870922d686
  project-setup/setup-wizard.md: 6df6fa5ace6ea9c656b510d70778244d8f7cd0d7b282eb758e29500546ed7c87
  agent-launching/agent-terminal.md: 67416eba886e659766975852cfc608cd4345a745edda7a3f864db6d12aa76a23
  agent-launching/feature.md: 43777ff30a80b22e43d6068f35709b7adc96bfd5ef681b9d466df921e420a407
  agent-launching/omp-chat-conversation.md: 65ca66e41f07c0b55aa3b9ce12bfd2cb58b6ced94d034d5396f2bdb1423992c5
  agent-launching/omp-chat.md: 1394dc66493c30e120f4d1e06b7046c8c90858d1daeba05a01a634cccc1a9bbf
  agent-launching/raffinamento.md: 6524fd9a80b1f4771e5e68399a57203ec66a73539e2f8c2ce666278788aff1dd
  requirements/ui/settings-specs.md: ac2f55158331a3b922d1863886daa76d9381bb4e5d7300174ef76223b1738f2e
  requirements/ui/general.md: 8534b8ffcb0a1a5bdafc21298503402b19c4a1240553c6a0dcf0c38c14129edf
  requirements/ui/setup-wizard.md: 6ee124488b15733ae7294ffdd46c72bc641faabc789b2e4c9e591f424ef04c98
  requirements/ui/agents.md: dc098b4a2c0f29f33ae95a89fb9bb8232bdba3d17f29ff709d26fd7cf4b191b7
  requirements/ui/raffinamento.md: de30c8343d5b84fd24206350b0aefa117ec5b6755f9b57a7227a374340e523ad
  requirements/ui/work.md: f5aafc63492309194f0a0c4af44213915ceff622b2e89f5f4a148d9f10530b06
  requirements/tech/settings.md: 3a19716a3e81a49718b9cc6cd568695ca9b5055dca962e76d6e85acbbb8a54b2
  requirements/tech/omp-chat.md: eb041f6c885efa569b85b24546195fc9ad93a68ebfb4d3519f634846078659b0
  requirements/tech/raffinamento.md: e111fa3306a1d9fbd234ae81f8b299683eea0e9b8c9a0ad230deab91fc6093bb
  requirements/tech/drifts.md: 960f8986ae0ba8737449b22d67242a0e97406594e30a786e5541678c75268928
  requirements/tech/drift-resolution.md: deda414f892c65185aff2fc1baca787f4236ba6b501ed6ba07a8f21cf51f81d7
  requirements/tech/setup-wizard.md: f22961e0e0e8d113e43bf53a6ff52e249e4cffa1163ca6353b76b9e6dbd58728
delete: []
request: 2026-10-24T15-20-26
created: 2026-10-24T13:31:22.145Z
label: Settings
---
# Settings come il wizard

La scheda Settings si legge con gli stessi principi del wizard di setup: una colonna, spiegazioni sempre visibili, gli stessi gruppi e gli stessi riquadri, nulla che si sovrapponga o compaia da solo.

Decisioni del developer:
- La pagina è una colonna singola centrata di circa 720 px, un'impostazione per riga, come il wizard; la griglia fino a 1100 px sparisce.
- Fra i gruppi si scorre la pagina: nessun indice né selettore dei gruppi.
- La spiegazione di ogni impostazione è testo secondario sotto il titolo, senza «i» né fumetti; per un menu a tendina, sotto il controllo, la spiegazione del valore scelto. Il codice del fumetto sparisce.
- I gruppi sono quelli del wizard, da un solo elenco condiviso: omp, Models, Project, poi un gruppo Advanced con i sottogruppi Appearance, Drifts, Agents e omp Chat. Auto Exit e la lingua restano nel gruppo omp. Il gruppo Features non esiste più.
- Ogni gruppo ha sotto il titolo la frase del passo del wizard; Advanced ha «Theme and optional features.».
- Lo stato di omp è il riquadro del passo omp del wizard, con versione e numero di modelli, ma la scheda non aggiorna omp.
- Nel gruppo omp, dopo le impostazioni, l'avviso dei file di istruzioni degli agenti del wizard, cercati ogni volta che la scheda si mostra, solo in un progetto Trama.
- Sotto ogni ruolo dei modelli il consiglio sul suo peso, come nel wizard.
- In cima la pagina ha il titolo «Settings», con Guided setup a destra sulla stessa riga.
- Ogni cambiamento si salva subito, come oggi.
- Le spiegazioni restano brevi: due frasi, circa 160 caratteri.

Scelte dell'agente da verificare:
- Nei pannelli più stretti di circa 480 px Guided setup va sotto il titolo «Settings», come le altre soglie strette del wizard.
- I testi del Modello e dei Requisiti che nominavano il gruppo Features ora nominano il gruppo Advanced e il suo sottogruppo.

Raffinamento sul Modello attuale:
- `panel/Board` resta come l'ha resa una Proposal approvata dopo (nessuna scheda della Board mostra i chip dei riferimenti); questa Proposal non lo tocca più.
- In `omp-chat-conversation` restano le chiamate degli strumenti come le descrive il Modello attuale (si leggono e basta, con il loro stato); questa Proposal cambia lì solo il gruppo delle due impostazioni di omp Chat.

## Already present
Per questi elementi cambia solo il nome del gruppo delle impostazioni (Advanced al posto di Features), che realizza il Task dei gruppi condivisi in `SETTING_GROUPS`; il resto è già nel codice.
- `agent-launching` — `extension/src/host/settings-schema.ts` (`SETTING_GROUPS`, `trama.ompChat` oggi nel gruppo Features); `extension/src/host/main.ts` (`affectsConfiguration("trama.ompChat")`)
- `agent-terminal` — `extension/src/host/terminal-agent.ts` (`askMoreOptions`, `askMoreCommandLine`) ed `extension/src/host/agent.ts` (`openAskMore`): Ask more senza frasi delle funzioni facoltative
- `omp-chat-conversation` — `extension/src/host/agent.ts` (`conversationLaunch`: `trama.ompChatApproval`, `trama.ompChatIntentTracing`)
- `omp-chat` — `extension/src/host/main.ts` (`affectsConfiguration("trama.ompChat")`) e `extension/src/host/settings-schema.ts` (`EXPLICIT_TITLES`)
- `raffinamento` — `extension/src/host/agent.ts` (`configuredAutoUpdateStaleProposals`)
