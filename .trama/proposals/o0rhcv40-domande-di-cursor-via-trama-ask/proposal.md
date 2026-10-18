---
status: approved
base:
  agent-questions/question-round.md: e99d0599b93fb858107c6e172705f02893d4e6ef069c14a58f41c363f50b3f50
  requirements/rules/questions-notices.md: 804fac8bcc2be294b1c87491d02b3d35d273410566aeba551bfd8e145ed5d06d
  requirements/tech/questions-notices.md: 307fade1d59ac3882c1aa96cb624b27fa4638a1414638cd96e75e1c5cffd3037
  requirements/rules/agent-terminal.md: 9f73e1d8205d424472b433be45efa9b6307852c20cd6d050c24b766b8b99c64d
delete: []
request: 2026-10-18T11-35-53
created: 2026-10-18T09:44:19.165Z
label: Domande Cursor
---
# Domande di Cursor via trama ask

Nella chat di Cursor l'agente fa le domande con il tool nativo di Cursor (AskQuestion) invece che con `trama ask`. Causa riprodotta: nella sandbox Linux di Cursor il processo è rimappato a UID 0, quindi `trama ask` cerca i record dell'editor nella cartella sbagliata e risponde subito `unavailable`, con un `reason` che ordina di usare il tool dell'agente; le skill poi chiamano `trama ask` «your question tool» e non hanno una voce per Cursor nell'elenco dei ripieghi.

Decisioni:
- Dalla sandbox di Cursor Trama trova l'editor con l'UID vero dell'utente; vale per ogni comunicazione con l'editor (domande, attività, annunci, autopilot). Il riprova una volta fuori sandbox resta come rete di sicurezza.
- Nella chat di Cursor il tool di domande di Cursor resta l'ultima risorsa: solo se l'editor è irraggiungibile anche dopo il riprova fuori sandbox.
- Il `reason` del risultato `unavailable` dipende dalla sandbox: dentro la sandbox di Cursor dice di rilanciare `trama ask` una volta fuori; altrimenti dice di usare il proprio tool di domande come oggi.
- Le skill nominano `trama ask` nell'intervista al posto di «your question tool» e hanno una voce Cursor fra i ripieghi, che nomina AskQuestion e dice quando è permesso.
- L'istruzione alla chat di Cursor ha una riga in più, «Ask the developer only with `trama ask`, as the skill says.», solo per design (anche da richiesta scritta e setup), import e Resolve Drifts; non per Copilot né per il terminale.
- Nessun hook di Cursor nuovo: AskQuestion non fa scattare preToolUse.
- macOS invariato: copre il riprova fuori sandbox.
- trama-scan resta com'è.

Ipotesi da verificare:
- La riga sulle domande va dopo quella sul PATH, e c'è anche quando la riga sul PATH manca.
- La risoluzione automatica dei Drift non fa domande, quindi la sua istruzione non porta la riga.
