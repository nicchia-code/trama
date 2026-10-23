---
status: approved
base:
  specs.yaml: d2839b73a146973c5d97614f3aebf72a5d0fd27b0c1f3782282168815ffba0f6
  agent-launching/feature.md: 7ce728c043af6c3773c4e8afb78937cb6490e895358bb3d587b309c6d2629bad
  agent-launching/agent-terminal.md: bd89673f4cd3917b693edd6149f526df6d09b59c6bc4f06335945119c67f9c84
  agent-launching/omp-chat.md: 66655d6ba42ddb07fc1bfdff599d3270d748289b22325d559c6a36f3a9ea21f9
  agent-launching/omp-chat-conversation.md: 6180705fa6852d37b3822bab199bb4d002adfb78d9c26dccd09e4a989199cbff
  requirements/tech/omp-chat.md: 264eedfc312be0036640c6029a0cdf30639471440cd082068e82a6ae4d182d84
  requirements/tech/general.md: 85eadddc667543a70c2c7e84694d1dc6abae7859d396c67f44907b4b2fe2bf3c
  requirements/ui/omp-chat.md: 7da20466927ef20ebeefeea7fb562762094cd9b719d747dd841acd0abe093a84
  requirements/ui/settings-specs.md: 99cc7f7fd522a785c4bf66b9f4d70567241375f77d136854a12512dba5d1ff7e
  requirements/quality/omp-chat.md: 41581bf79327d0eb70225e2f65a4f8102d104773a8340eeb6b8d73fd3b70c199
delete: []
request: 2026-10-23T13-42-00
created: 2026-10-23T11:54:20.928Z
label: omp Chat
---
# omp Chat a destra

Il developer vuole omp Chat nella barra laterale destra, non nel pannello in basso accanto al terminale. Oggi la vista è dichiarata nel pannello in basso perché la versione minima dell'API (1.95) non conosce la barra laterale secondaria e Cursor la rifiuta: Cursor 3.27.6 risponde a un contenitore `secondarySidebar` con «View containers cannot be contributed to the Secondary Side Bar in Cursor. It is reserved for Cursor's agent UI.», e nessun comando permette a un'estensione di spostare da sola la sua vista a destra in Cursor. VS Code accetta un contenitore proprio nella barra laterale secondaria dalla 1.106, senza API proposte.

Decisioni dell'intervista:
- VS Code: omp Chat ha un contenitore proprio nella barra laterale secondaria, con la sua icona; la versione minima di VS Code sale a 1.106 (gli editor più vecchi non installano più l'estensione; Cursor 3.27.6, base 1.128, la installa).
- Cursor: omp Chat resta nel pannello in basso, con una seconda vista dichiarata lì e mostrata solo in Cursor; il README spiega come portarla a destra a mano con Move View → «New Secondary Side Bar Entry», e Cursor ricorda lo spostamento.

Scelte dell'agente, da verificare:
- La vista del pannello conserva gli id di oggi (`trama-omp-chat`, `trama.ompChat`), così uno spostamento a mano già fatto in Cursor resta; la vista della barra laterale secondaria ha id nuovi (`trama-omp-chat-sidebar`, `trama.ompChatSidebar`).
- Una sola chiave di contesto, `trama.ompChatVisible`, che vale `sidebar` fuori da Cursor e `panel` in Cursor quando la vista c'è, e falso altrimenti; ogni vista ha la sua clausola `when`.
- Cursor si riconosce come già fa Trama, da `vscode.env.appName` che contiene «Cursor»; ogni altro editor ha la vista a destra.
- La descrizione dell'impostazione `trama.ompChat` non nomina più la barra laterale secondaria, perché in Cursor la vista sta in basso.

## Already present
- `agent-terminal` — extension/src/host/agent.ts:115-116 (`ompChatInUse`), :681, :770: con omp Chat in uso l'istruzione va in una conversazione invece che in un terminale; cambia solo il testo che dice dove sta la vista
- `agent-launching` — extension/src/host/agent.ts:115-116 e extension/src/host/omp-chat/: omp Chat sostituisce il terminale di omp; la posizione della vista la realizzano i Task di `omp-chat` e `omp-chat-conversation`
