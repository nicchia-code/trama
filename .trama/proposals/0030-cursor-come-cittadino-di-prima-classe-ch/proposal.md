---
status: open
base:
  actors/cursor-chat.md: new
  agent-launching/feature.md: 4196e7638deeb74ca15a351c10d368ae27797ebed225e66938a77a2273528eaa
  agent-launching/agent-terminal.md: bdb107bfa151f7b3710e666cacf9cd8be96fc63d0963bde367300be909e6b3f7
  work/announcement.md: f2963ef9ec69033e38aea28061fc3ca43ed8cb88119933114737719acf4a0b6c
  work/task.md: c13b0f13ecb32c5bc02e2a104cc7e09a5aebeffa64206cfe79745194ad859531
  away-notifications/feature.md: d1cd9837207546a66503b7fc90d6194fdc4150dd7dfce0e3e3387fee4d553668
  away-notifications/notice.md: 8ecfcc9dfaeafac27bf11aaf798775d3efeacc9441bd74d9b8f7dd311090551b
  agent-questions/question-round.md: 0d79e13c71489ef19d06e310664806fc28808f5867ecb84feb7302f96dd0493c
  project-setup/project.md: 2aefdfc0f714aa9ed95a200d6bf86635abb4756ca286bd0a8246f0a041f7e6b6
  requirements/tech.md: 19b0d6ffa9f5fcaa915310d5100322e1a17b3d043d423ba2710f5f75b374fd06
  requirements/rules.md: 5c271e9639b34879abacad72a2731e3508946c468d9849b97bd8a09e42dfc127
  requirements/ui.md: 88b944c980f9ef0b6ccae0d625a62c395a3ddde2ef28e6d743c7a967f37742fc
  requirements/quality.md: bc2378eef58ffa4d40babe6ca86bb9fdc74a48c85a3b0baf3b21f161d066b915
  requirements/data.md: 0e76951fb37b330c73c7fabbf7e7df20af1607ae9ebe3697dd6dbbe0bfc25334
delete: []
---
# Cursor come cittadino di prima classe: chat integrata con invio automatico

Perché: Cursor deve funzionare come gli altri agenti, non come ripiego con la clipboard. Verificato su Cursor 3.22.12 (installato) e 3.23.12 (ultima stable, letta nel bundle): la chat di Cursor può ricevere un prompt e inviarlo da sola; i suoi hook (`beforeSubmitPrompt`, `stop`, `sessionEnd`) dicono quando un agente parte e si ferma; la shell dell'agente imposta `CURSOR_AGENT=1` ma NON eredita il PATH dell'estensione.

Decisioni prese al posto del developer (da controllare, il secondo giro di domande è stato saltato):
1. Nuovo valore `auto` di `trama.agentLauncher`, nuovo default: in Cursor usa la chat, altrove il terminale come oggi. `terminal` e `chat` espliciti vincono sempre. Il Cursor CLI resta usabile con il terminale (`agent {prompt}`).
2. Consegna nella chat di Cursor, in questo ordine: `composer.createNew` con `autoSubmit` (comando interno non documentato, provato su 3.22.12: invia da solo); deeplink `prompt` con `workspace` e `mode=agent` (documentato, chiede conferma e Invio); clipboard con avviso. Il deeplink è saltato se Cursor lo rifiuta (testo con `.env` o oltre 10.000 caratteri).
3. Scansione automatica dopo l'approvazione: parte da sola se la chat invia da sola; se la consegna ripiega su deeplink o clipboard, invece di aprire una chat in attesa il developer riceve un avviso con un pulsante «Scan now».
4. L'agente della chat di Cursor non trova `trama` sul PATH: la seconda riga del prompt gli dice di aggiungere la cartella del binario al PATH.
5. Il CLI riconosce `CURSOR_AGENT=1` come `TRAMA_AGENT=1`: le decisioni del developer sono rifiutate anche all'agente della chat di Cursor.
6. Fine del lavoro seguita con gli hook di Cursor in `~/.cursor/hooks.json` (non nel repo), scritti da Initialize e Update skills con percorso assoluto del binario. Sono di Trama le conversazioni il cui prompt inizia con «Use the trama-». A ogni `stop` si rilasciano i Task presi e parte l'avviso ntfy; i fantasmi si ritirano solo con `aborted`/`error`, fine conversazione o il timer di 15 minuti.
7. Sandbox di Cursor: `trama ask` probabilmente non raggiunge l'editor dal sandbox (non provato). Le skill dicono di riprovare fuori sandbox prima di ripiegare sulle domande dell'agente.
8. L'Agents Window di Cursor 3 non è supportata: il pannello vive nell'IDE.
