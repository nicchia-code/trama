---
status: approved
base:
  system.md: 906a0a115aebc101dfee548be860a34573ccb01a9f735a46d1330bee3a76acf8
  actors/developer.md: b3fdcf064f15af3cbcca8fda5c99c24a9899375405c0594acb789f4a430f3081
  agent-launching/feature.md: 7a9482547df101c999f1d919829d408a47ac751f4cc365c0c43db4db753d7100
  agent-launching/multi-branch.md: new
  agent-launching/worktree-round.md: b9a59b2c94aa1d48f1b306c7bf6d68a15dc8c9f962f4b1fbb8ced0633cef2e1d
  model-changes/feature.md: 8305727046514267bcff9db5580215077a4bfc67a0bf0f479917f1903c4af1b9
  model-changes/proposal.md: 8ffa833bea5030e900344cf775d56d780d0623b6361459997da2c97cc97fe75a
  editor-panel/panel.md: 07f75e6566307b331ba2a00f97082e1590a8def8efda12c5800e9ef0f7b9bc4d
  requirements/ui.md: 0ddb0977780151c93d4a37b88a7c1ba84e08b6a22f095bbaafcb72082ab532a4
  requirements/tech.md: a905a74eb5874580db84ad0d4273765793e1a3725d48295277d82db506ce80a2
  requirements/data.md: 9db58714a554a1c869052aa454306cfa12eb311c67ed98c0ff4dfac4c92ba7c5
  requirements/rules.md: 8e4fadb15839a60901471f871b0551f02964049d3a474ec80b258c2986b84312
delete: []
---
# Accendere il multi-branch da un interruttore nel pannello

Il multi-branch si cambia solo da un'impostazione del progetto, facile da perdere, e si scopre che manca il comando dell'agente solo al momento dell'accettazione.

Decisioni:
- Uno switch Multi-branch in ogni scheda del pannello, subito dopo Design…, che si accende e si spegne con un click, senza conferma.
- Il comando trama.worktreeAgent resta un'impostazione utente. Senza, lo switch non si accende e un avviso chiede di impostarlo; gli altri controlli restano all'accettazione.
- Spegnere non chiude un giro già aperto: le accettazioni successive tornano nella cartella aperta. Riaccendere prima della fine le fa rientrare in quel giro.
- La voce trama.multiBranch sparisce. Una chiave già scritta nelle impostazioni non si legge e non si cancella.
- Lo stato sta in .trama/multi-branch/, con il suo .gitignore, come le richieste: vale per questa copia di lavoro, assente vuol dire spento, un file illeggibile è spento con un avviso.
- trama proposal approve legge lo stesso file e, acceso, segue la stessa strada del pannello.
- Scelta da rivedere: l'avviso sul file illeggibile non si ripete finché quel file resta illeggibile; se la scrittura fallisce, lo switch non cambia e un avviso lo dice.
