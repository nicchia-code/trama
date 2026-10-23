---
status: approved
base:
  agent-launching/chat-advisor.md: c3887eb8df1297c2700638ed8e73e9bd5d9f5f9d2c0d2960150a17c7bfaf8b56
  actors/editor-chat.md: fd23066342d11998882216c3a88ff84c7cbbe78ecde32d8b99458a4dbd56f7d0
  requirements/rules/chat-advisor.md: 3f87890e77ce441cff13bd063f41936c87ceeedbb297ca22b68b77ffa061fabf
  requirements/tech/chat-advisor.md: b15b3769842570c1d88865899a3a7cf495ce69e82e588ccf4ed585aa69b6ad13
  requirements/quality/agents.md: 3d771df552d747f8117a4342d336418c2c84f838fb444132e8514a8797424c17
delete: []
request: 2026-10-23T10-25-58
created: 2026-10-23T08:52:16.622Z
label: chat-advisor
---
# Advisor della chat in background

Con omp l'advisor gira accanto all'agente e non lo ferma mai durante il lavoro; nella chat di Cursor la revisione continua è un sotto-agente `trama-advisor` che l'agente può far girare in primo piano e aspettare (o controllare a mano), e le sue note arrivano solo attaccate al risultato del prossimo strumento, un canale che Cursor può lasciare muto. Questa Proposal avvicina l'Advisor della chat a omp restando dentro la chat di Cursor.

## Decisioni
- Meccanismo: round in background nella chat; resta il sotto-agente `trama-advisor`, avviato dall'agente quando Trama lo chiede (niente CLI headless, Desktop Bridge o SDK).
- Attese: l'agente aspetta l'advisor solo alla fine del sotto-agente di un Task (revisione del Task) e alla fine della corsa (revisione finale), come oggi e come omp; un round continuo non si aspetta e non si controlla mai.
- Un advisor per agente guardato: l'agente principale e ogni sotto-agente di Task hanno i propri round.
- Consegna delle note: le note sono il risultato finale del round, che Cursor consegna da solo all'agente; `trama advisor review` dice a Trama l'esito e Trama conserva le note in memoria per riportarle nella revisione del Task o finale, dove `trama-advisor` controlla che siano state corrette. Trama non aggiunge più le note al risultato degli strumenti.
- Avvio: alla prima modifica che conta, al più un round alla volta per agente, che raccoglie le modifiche arrivate nel frattempo (mai decine di sotto-agenti).
- Contesto del round: i file cambiati e la parte della trascrizione dell'agente scritta dall'ultimo round, data come percorso e posizione in byte; Trama non legge mai il contenuto della trascrizione.
- Background per chiamata (`run_in_background`) con una sola definizione `trama-advisor`; nessuna `trama-advisor-background`.
- Esito di un round arrivato dopo la richiesta della revisione del Task o finale: l'agente lo ignora e Trama ne dimentica le note.
- Versioni di Cursor: supportata da 3.27.6 e le successive che passano lo smoke test; su versioni precedenti un round può girare in primo piano, senza avviso.
