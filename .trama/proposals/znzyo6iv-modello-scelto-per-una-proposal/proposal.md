---
status: approved
base:
  actors/developer.md: f148176770de96d26247647f8f91fce4f361716bd041fadd8e3857ae810c19ce
  model-changes/proposal.md: 8d456ad7ac95fa39988fa12ea7c0937dfc74a358bcdc90b9a0f28bcb63a6f03e
  editor-panel/panel.md: f453d2f47badbf31e9ce6de529c4ff16239c4c1040c0a244268ed32a1cfa3820
  agent-launching/feature.md: f63a9424e083e37e4e82d94aa872b8ac1b277c4ee84ce8ad355411737028981f
  agent-launching/agent-terminal.md: 4b9617f74095df891c458b03c7051530b4eda1cce07e7a0db7ceb95606e550ed
  work/task.md: 813426f889055778f2ae0e01956cafe29e39789e219cafa6814ae8c34a0eab1b
  requirements/rules/models.md: 0fbc47e5270e0fcd5e4a2f6071aa1ee43d4a7cfb804f33bf58f105ef86b23451
  requirements/rules/agent-terminal.md: bdcfdea39cf8dd06f2f6ee20df95071b8b6622388c1db40a2ddd8939dbfffe22
  requirements/tech/models.md: e54b181292c156a499f446f4c08201e2b85ae441e3be8b08bbd58c7487d80def
  requirements/tech/work.md: d356bf8c9f0301e6f514fd184473225b898cf048ca26e3eaabf4a2ca251bb4e1
  requirements/tech/proposal.md: 02eadacc97bfcd961309ab5d30a64808d1a0507e1ddd237f22459b644c64cce4
  requirements/ui/agents.md: 008d7007f7ce83d457243dd70614e716f3e6e162bcbf1b3b442b968d7c1ccbf3
  requirements/ui/tasks.md: ae2e163b9789fc382ef00f83a8e9f7816ca9eac1b27a37915f98d502b8279d62
  requirements/quality/main.md: b4809b1b51d879e48b66ac008fb96a52a2aad1d2f72a555448f84d791bd2f600
  requirements/data/proposals.md: a025b5fbcd539f7c2dc6c8b25c801b23321e574ff41ea2ee35496492c6fc2e21
  agent-launching/drift-resolution.md: 1f739b4ada9c2c7616b099f1a4d029d0ec800170401195202c4bfc055eda09a9
delete: []
request: 2026-10-17T19-03-32
created: 2026-10-17T17:24:49.243Z
label: Modello per Proposal
---
# Modello scelto per una Proposal

Il developer vuole personalizzare una Proposal scegliendo il modello con cui lavorano gli agenti dei suoi lavori, dalla scheda della Proposal, con le stesse logiche dei Settings. L'override vale per analisi ed esecuzione, mai per gli scan.

Decisioni dell'intervista:
- Il modello della Proposal vale per i Run dei Task che le appartengono (compresi i Task di correzione dei Drift nati da un suo Task e quello di rimozione del codice) e per Resolve su un singolo Drift nato da un suo Task. Resolve all e la preparazione della risoluzione automatica restano su `trama.analysis`.
- Nei Run l'agente principale usa il modello della Proposal anche per pre-flight e scansione mirata di fine corsa; i sotto-agenti `trama-analysis` restano su `trama.scan`.
- `Run all` e il Run automatico, con Task di modelli diversi, diventano una sequenza di Run, uno per modello: gruppi fissati al clic, in ordine del Task in To do più vecchio di ogni gruppo; ogni Run prende tutti i Task in To do del suo gruppo, anche quelli nati mentre lavora. Un Run interrotto (terminale chiuso dal developer, turno della chat interrotto) ferma la sequenza. La sequenza conta come un solo Run per i pulsanti che lanciano un Run.
- I Task senza Proposal e quelli delle Proposal al default formano il gruppo dei Settings (`trama.execution`).
- Il default è nessun override: valgono i ruoli dei Settings, e un ruolo vuoto il predefinito dell'agente.
- Il modello si conserva solo in locale, nello stato dell'estensione per l'area di lavoro, mai nel repository, e ricorda l'agente per cui è stato scelto: con un altro `trama.agent` vale il default.
- Si sceglie solo dalla scheda della Proposal in Backlog, per le Proposal che portano Task; dopo l'approvazione resta quello scelto. L'ingranaggio è sempre disponibile, anche mentre la scheda aspetta la fine del turno dell'agente.
- Trama dimentica il modello quando la Proposal è rifiutata o scartata, o quando è approvata e nessun suo Task resta da fare.
- Il modale ha un campo come nei Settings (testo libero, tendina dei modelli suggeriti per l'agente scelto, vuoto = default, salvataggio immediato) e il pulsante `Close`.
- L'ingranaggio sta in testa alla scheda, a destra; un badge con il nome del modello sta sulla scheda; un modello scelto per un altro agente si mostra spento con la spiegazione.
- I terminali dei Run della sequenza si chiamano `All tasks · <modello>`; il gruppo dei Settings resta `All tasks`.
- Nell'avviso del modello non trovato di Copilot, al posto dell'impostazione compare `Proposal <etichetta breve>`.
- L'istruzione di ogni Run della sequenza elenca le Proposal del gruppo e `trama task next --batch` le filtra (inclusione per un gruppo personalizzato, esclusione per il gruppo dei Settings).
- Fine normale di un Run della sequenza come la giudica già il codice: un comando che finisce con codice 0, anche senza hook a riposo, lascia partire il Run successivo; codice diverso da 0, terminale chiuso o chat interrotta fermano la sequenza. In Copilot, che non segnala interruzioni, un turno interrotto vale come fine normale.

Assunzioni: la chiusura del terminale fatta da `trama.autoExit` dopo la fine dell'agente non è un'interruzione; una Proposal tornata a Draft conserva il modello scelto.
