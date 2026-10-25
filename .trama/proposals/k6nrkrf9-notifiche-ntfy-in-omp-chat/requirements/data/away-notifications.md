---
description: "Use when touching what Trama keeps for the ntfy notifications: settings, access token and notices in memory."
---
# Away notifications data

## notice
- Notices live only in the memory of the extension host of their window. They are never written in `.trama/`, in another file, in `workspaceState` or in `globalState`, and they are never shown on the Board; they disappear with the window, and none is recreated at the reopening.
- A notice holds its kind (finished, question, permission or stopped), the name of the project's folder, the identity and the name of the conversation, or for a finished notice the names of the job conversations whose work ended since the window last started working, the round or the permission request it is about, its state and its timers. Title, message, tags and priority are composed only when it goes.
- The window also keeps in memory whether it is working and when the quiet of its finished notice started.

## away-notifications
- Settings: `trama.ntfyServer` and `trama.ntfyTopic`, in the user settings only. Access token: `trama.ntfyToken` in the editor's keychain (`ExtensionContext.secrets`), one per user, shared by every window. A `trama.ntfy` left by older versions is ignored and not rewritten.
