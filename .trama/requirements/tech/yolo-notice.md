---
description: "Usa quando implementi l'avviso, mostrato una volta, che omp Chat esegue i comandi senza chiedere (yolo)."
---
# Avviso di yolo

## omp-chat-conversation/Agent running
- yolo notice: the host keeps in `ExtensionContext.globalState` (shared by every window and project of the editor) the key `trama.yoloNoticeShown`, `true` once the notice of `ui#omp-chat-conversation` was shown. When a conversation process is about to start (a job, Ask more or General, not a resumed one), with `inspect("trama.ompChatApproval").globalValue` absent and the key not `true`, the host writes the key first and then shows the message with `window.showInformationMessage`, without waiting for the answer: the start of the conversation does not wait for it. `Open Settings` does what the button of the omp-missing notice does. Tests cover: shown once with the setting absent; never with `ask` or `yolo` saved; never again after the key is written.
