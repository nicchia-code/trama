---
status: approved
base:
  actors/editor-chat.md: 80f7ecf5afc515fdc2edd25e94548fe7d20387c27cdb2cc0e09ebefca4b16401
  actors/agent.md: f2ba16abbc72d15d97b6ebfded2fdf152b0e02d23ebf529ba9b45b0ef5144285
  agent-launching/chat-advisor.md: new
  agent-launching/feature.md: a0873a9f2497702b53d96745a02f0189f5682811325bf4a3b4e01e8f4a234f12
  agent-launching/agent-terminal.md: 8b7f20597d041a1b079c48ed6fdc63442a9c2b8621636808d211eea246c6de63
  work/task.md: d00fd4920bff429d4b0bb1019701a2dc51f7e7847fb1aac17b452539457625a5
  work/announcement.md: e8fc08ebec821d84b24b0b34223321f61b42da0750fd5911ae45b71c6321fc0a
  work/drift.md: cff0ba595b5f00ec548ad62398a851281e1cd59d9c8cc5d2831b97068ba6a16e
  editor-panel/panel.md: 178c1e0daa9eda1bc1bb4cab941f311f04cca31e20296979a66e708468c78e9b
  project-setup/project.md: a4175f547caebc40f25b4675e34b47b6aec8018f73a984ac3227c5d30a94e38f
  requirements/rules/scans.md: abe135799a94a25a0234c6cb8c55c1b8297a561fc6489386d5538d5272914a86
  requirements/rules/task-progress.md: 504e072db8bcfd9949dd4c1f9e7c514f56d894b840b11a45bf43cf1195c23c58
  requirements/rules/announcements.md: 86cdcb3f02794b763ed5128e5ac685571b9e1b677fa0149a0173dfe8911cceba
  requirements/rules/turn-history.md: d9e5ccb9656147f9212e4c7738747d7ba209c3d28f8bea18d5c6b7a6b26ea017
  requirements/tech/editor-chat.md: 3674ff8b3be778c8a0a96dfac1e4c5f17aac222b7befb13597b2b65b89ac5e57
  requirements/tech/chat-advisor.md: new
  requirements/tech/models.md: 738415aca0415eb7abd6569e8c14c23de85bb3065174f5a57ecbd7ae9d4ba7e3
  requirements/tech/settings.md: 1cadd4bdc48621d919a27cdc46856cf3fc396de0827eae6697028f133845e51b
  requirements/tech/drift-resolution.md: 39ee65221a66972abe93cc64c6f66178403367cdae63d9d7aacb81944006a52e
  requirements/tech/announcements.md: 89d84c50d85396cfb465867a5dc1e6223e4b3fc362a922ea1cc6a890656df761
  requirements/tech/scans.md: b07ca8375822a32237702e4684b2161075a430f5068b21282effb8eb0df1914d
  requirements/quality/agents.md: 170b659e73c7feb6571a4002ed04d9f1327e58336358eb60b3b1a981af711888
  requirements/ui/settings-specs.md: d2f2a302dffc6d70a16716a66284d180ca104a9725b84a4f8d90d9f9d9a1a623
  requirements/ui/panel.md: f29b051a3ccc0aafeb0051cf864fdc4e7227dd10344716c81d5e1a2dccf11ec2
  requirements/ui/agents.md: 6c7be5a65670d3eb332507cdf990c7a72343372382212f23de75c71004532676
  requirements/data/work.md: df65ea0d5d1196ebaec00cec290d754b29a428b49fddbfff8c71a310a2c9b14b
  requirements/data/proposals.md: aeafb9c52bf6fc5750951bc86afc6c18ba52c50266913ab2f71999bede0c074f
  requirements/data/agents.md: c1b48f600191a04da2603da3c6968ee0c51c7c2bd25efb44bb010115f47c991d
  requirements/cli/main.md: 72b699c5bb99b1d11c9f09abd97bec1896d1f4b893ebabfdec116a253d34519b
  requirements/rules/chat-advisor.md: new
delete: []
request: 2026-10-21T12-48-28
created: 2026-10-21T11:08:14.634Z
label: Cursor first citizen
---
# Cursor alla pari di omp

La chat di Cursor diventa un agente di prima classe: le funzioni sperimentali che oggi funzionano solo, o male, con omp funzionano anche nella chat.

## Decisioni

- Ambito: Advisor Scanner nella chat, identità del lavoro per i comandi della chat, Task e schede tenuti per conversazione.
- L'Advisor della chat è di Trama: il sotto-agente di Cursor `trama-advisor`, sul modello di `trama.scan`, chiamato attraverso gli hook di Cursor (Cursor non ha un advisor come quello di omp).
- Revisione continua: dopo ogni modifica, comprese quelle fatte da comandi di shell come git, l'hook chiede all'agente di avviare `trama-advisor` in background; l'agente non si ferma e le note gli arrivano con il risultato di un tool successivo. Una revisione alla volta per agente; la successiva copre le modifiche arrivate nel frattempo.
- Revisione del Task alla fine di ogni sotto-agente che realizza un Task, e revisione finale della corsa alla fine del turno dell'agente principale: entrambe finché sono pulite, al più 3 volte.
- Se la revisione finale non può avvenire, il Run finisce come oggi e la Board avvisa in cima che è finito senza la revisione finale.
- Se la versione di Cursor non consegna le note durante il lavoro, nessun avviso: restano le revisioni del Task e finale, che ricevono le note non consegnate.
- Identità: un hook completa ogni comando `trama` dell'agente della chat con la sua conversazione e il suo lavoro.
- Ciò che registra un sotto-agente appartiene alla conversazione principale che lo ha lanciato.
- Un comando della chat che arriva senza conversazione vale come oggi: appartiene alla chat del progetto.
- Gli hook frequenti leggono un piccolo file di stato dell'editor nella sua cartella utente e contattano l'editor solo per le conversazioni che lo riguardano; un comando di shell che non lancia `trama` non legge nulla, salvo nelle conversazioni con l'Advisor, dove dopo il comando si guarda lo stato di git.
- Le note dell'Advisor aspettano in memoria dell'editor, mai in file del progetto.
