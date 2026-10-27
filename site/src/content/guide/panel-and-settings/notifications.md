---
title: "Away notifications"
description: "Get a notification on your devices when the agent finishes or waits for you."
order: 4
---

When you step away from the computer, Trama can tell you that it is your turn. Set an **ntfy topic** in Settings, and each editor window sends a short notification to your devices when:

- it has stopped working on the jobs it launched in omp Chat;
- one of those jobs waits for an answer or a permission from you;
- the agent of one of them stops abnormally.

Only jobs in omp Chat count: design, scan, Run, Resolve Drifts, Unify Drifts, import and refinement. **Ask more** and **General** never notify, nor does a job that runs in a terminal. Every window notifies only for its own conversations. Nothing is sent when a window closes or reloads.

## What a notification says

Only the project, the conversation and what happened, with an emoji: `<project> - <name> finished` (✅), `asks a question` (❓), `asks permission` (🔐), `stopped` (⚠️). Never what the agent wrote, asked or did. Without a topic, Trama sends nothing.

## Set it up

In **Advanced › Notifications** of Settings:

- **ntfy Server** is the server that receives the notifications. The default is the public `https://ntfy.sh`.
- **ntfy Topic** is the topic, 1 to 64 letters, digits, `-` or `_`. On ntfy.sh anyone who knows the topic can read the notifications, so choose one that cannot be guessed.
- **Set access token** saves a token for a protected server; the token is kept in the editor's secret storage, not in the project.
- **Send test notification** checks the configuration.

```screenshot
scene: settings-omp-chat
alt: "The Notifications group at the end of Settings: the ntfy Server field with https://ntfy.sh, the empty ntfy Topic field, and the Set access token and Send test notification buttons, under the omp Chat group."
```

These are the only requests Trama makes to a network, apart from Team's reads. A notification that cannot be sent is tried once more and then dropped without disturbing anything.
