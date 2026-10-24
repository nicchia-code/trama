---
status: approved
requires:
  - 3uzj1g3z
base:
  actors/developer.md: 11e70fe8e839c87d03c16303881b0c74289c5592cc24ab13918e0bb95f46929f
  actors/omp-acp.md: 0fc404df5fe032bbc32eb7a0b051180f68318a095f24a8ca3ce0e68da8b3ac9a
  actors/agent-hook.md: e9eac9e30cae5218b4ffc9498e4f88cc7e7f8c7dedb4dbce6cfffdc440776fff
  agent-launching/omp-chat-general.md: new
  agent-launching/omp-chat.md: 4ce9b22a8c4f7eaa6cd0a544bc196fd9aa7516343a9266d769fb2b9a4574f144
  agent-launching/omp-chat-conversation.md: dc3bc13fc4c570128d1cbdc755e4e3d9c73f977df1d6a684fc82ff85690f7a1c
  agent-launching/agent-terminal.md: f8c5e89abb59b490f26c415d2cd93e1ddb359693c001b04f91ceca4d4ac57dfd
  agent-launching/feature.md: a57261602fd0d2f377842470d04dc4580fb525cb7f44c9c4f1dec781705f2f49
  work/announcement.md: 14f27b677fc8d507a59ce8ce1b531a2707be5bc3f38758cb9143e9705da46836
  editor-panel/panel.md: b42bfa4b883e400cd83493a05b953dc8f920e2fc493a52c4d7714f3b1d9d262d
  requirements/rules/omp-chat-general.md: new
  requirements/tech/omp-chat-general.md: new
  requirements/ui/omp-chat.md: a5bcff8ca626c701fadf255aef200456b686f1e4f8d50b53cc15d192e5f80a80
  requirements/ui/ask-more.md: 5d465d496cab0cad1ba553abb31bf573d317e1de9a50a822c4be405ceb889c6d
  requirements/ui/panel.md: b0cd78b9c81e1b0260c4c7cbe08dbaa79b5aff2b8acde523ce94bdb63bdc2783
  requirements/ui/ghosts.md: a0c57dc4bc2964f7814a3a17e05c73abd71c626ac86337052463d02b44d96480
  requirements/ui/board.md: 8522d39cb2cc4e144c77b2fc584d7ae25d04bfcbf8851d90f5d7b53091d7e5d7
  requirements/ui/rework.md: ddd13f620931bbbd378b2cf59774e354f53e29c0dfa973113321487c97e56ec4
  requirements/ui/unify-drifts.md: 18e41499dfd4c65fefb40540a9916df5dce9136715995c3a24aca841fead8de1
  requirements/quality/omp-chat.md: e5f86cf84b9294e8ca0b80cb45cbceba2e98f3bebd734246eb296f4e1bd1daec
  requirements/rules/agent-terminal.md: b6123dc6e9847e6b16dc6e312e36b1178b2ac325ce99072cdf6b08b90bf2bf55
  requirements/rules/ask-more.md: 277846cb8d064a00b5f3f269c7528d2cf32b5a735bd05a771c4196c5e4e526e9
  requirements/rules/omp-chat.md: 43ab0398b81439fde8e74b6645eb3ed4d6d9c829e5ea0efb3bc8a6213d16107f
  requirements/rules/tasks.md: a106407b75629080f9f7e8b21b74bbca7da4b04d8cef6bf467c279a6aaf1693b
  requirements/rules/turn-history.md: eee768144a5364df563a69db67882422db48ff2de0e1ca01c17e1294762148fe
  requirements/data/omp-chat.md: 25f2a037731ed95744699d7e7d3e68450916992b5e9dade2542dc81b5c35f193
  requirements/tech/agent-terminal.md: c2815609adf7ca6db9b8ad3688d0009617e9980f605e3ce1928253011f4a301c
  requirements/tech/ask-more.md: 1431e41c81177e26a37f92925a9bd1a15c8f42200a2c8d013469079fe38a0858
  requirements/tech/omp-chat.md: bc5de08cd34dea67e695922ce881a8aa7c1ff4afe6c0c7b2c415c157db2f808b
  requirements/tech/rework.md: 3173d9a1d8e43819bb779ec90244f874cfd9b5b2a5459abed1ffb311a9b25489
  requirements/tech/unify-drifts.md: 0436602d861168c1fdbab3068c4538a817c9c6e867cc316d1716bba36fa4c139
  requirements/tech/models.md: 634054e9ec1a1196f82f547107917c981b6646a15d82b872d8fe75da899af40b
  requirements/rules/quick-task.md: 43e4c41850ac1bbf6478b4e71daa59ec9e32d9f2650cd44094e67b9046aa9cfb
  requirements/tech/quick-task.md: a20270214e8d67c2e7a33e98853e70f24f57c8c0986d2d98ab3c26c00cba431f
  requirements/ui/quick-task.md: afa4a6b1f98ed06ed36056f1701c429f63bf23a627f709bff0911bde3e0b87a1
delete:
  - requirements/rules/quick-task.md
  - requirements/tech/quick-task.md
  - requirements/ui/quick-task.md
created: 2026-10-23T20:28:38.899Z
label: Chat General
---
# Conversazione General

omp Chat ha sempre una conversazione General, una chat libera con omp in ogni finestra con una cartella; chiuderne la scheda la pulisce invece di chiuderla. General prende il posto di Add Quick Task, che sparisce.

## Decisioni
- General esiste in ogni finestra con una cartella aperta, mentre omp Chat è in uso; senza cartella la vista resta vuota come oggi, con il suo testo.
- Il suo omp parte all'apertura della finestra (e quando omp Chat si accende), non al primo messaggio.
- La scheda di General è sempre la prima e resta fissa; al posto della `X` ha un'icona gomma con tooltip «Clear General».
- Chiudere la scheda (o `Delete` su di lei) la pulisce: si ferma l'agente, si scarta la conversazione e la sua sessione, la scheda resta vuota e un omp nuovo parte subito. Conferma solo se l'agente è in un turno: «Clear General and stop its agent?», pulsante `Clear`.
- General è omp senza istruzione di Trama né hook, con il modello del ruolo `trama.analysis`; segue l'approvazione e l'Intent Tracing di omp Chat e ha il selettore del modello. Non è un lavoro di Trama: nessun ghost, nessun annuncio al lancio, non tiene in corso il controllo di esecuzione e non conta per i Run.
- Dopo una ricarica della finestra General riprende la sua sessione, ferma e senza messaggio di ripresa anche se l'agente era in un turno; se la sessione non si riapre, General riparte vuota, senza avvisi sulla Board.
- Spegnendo omp Chat, General sparisce subito se l'agente non è in un turno; in un turno resta finché il developer non ne chiude la scheda, che allora la chiude davvero.
- Se omp non parte, o si chiude da solo, il motivo compare dentro General e il testo scritto resta nel campo; Trama riprova al messaggio seguente, riaprendo la stessa sessione di omp, e se non si riapre con una sessione nuova, con la storia di prima visibile sopra. Nessun tentativo automatico, nessun avviso dell'editor, nessun terminale di ripiego.
- Con omp non installato General mostra al suo interno che omp manca, con Install omp; installato omp, parte al messaggio seguente.
- Vuota, General mostra al centro «Chat with omp in this folder. Trama's jobs open in their own tabs.»
- Add Quick Task sparisce, con il terminale Quick e le conversazioni Quick; la freccetta di + Add Work Item resta, con la sola voce Unify Drifts.

## Scelte dell'agente da verificare
- Un messaggio scritto mentre il suo omp sta partendo aspetta e parte appena la sessione è aperta.
- Ciò che l'agente di General annuncia o archiva su richiesta del developer arriva sulla Board come dal Quick di prima: le schede che consegna non aspettano la fine del turno, e gli annunci ancora in attesa si ritirano quando il suo omp finisce o General si pulisce.
- All'apertura della finestra è in vista General, salvo le conversazioni dei lavori riprese, che si mostrano come oggi.
- Con omp Chat spenta, una General rimasta per un turno in corso ha di nuovo la `X` («Close General») e chiuderla la toglie; una General così non si riprende dopo una ricarica.
- Le conversazioni Quick salvate prima del cambiamento, ancora da riprendere, riprendono come le altre conversazioni finché il developer non le chiude.
- Le regole di apertura, focus, ghost e fine che Ask more prendeva dal terminale Quick sono ora scritte per Ask more, senza cambiarle.
- General cerca omp come ogni lancio ma non fa il controllo degli aggiornamenti né l'aggiornamento, così l'apertura di una finestra non mostra notifiche di omp; gli aggiornamenti restano ai lanci dei lavori.
- General non apre mai da sé la barra laterale secondaria e non prende mai il focus.
- General lavora nella cartella che il pannello usa per la finestra, anche quando non è un progetto Trama.
- Senza `--config` né overlay: General non riceve l'esclusione dei file di istruzioni, come il Quick di prima.
