---
description: "Use when writing the texts of Trama's ntfy notifications or building the Notifications sub-group of the Settings tab."
---
# Away notifications interface

## away-notifications
- The `Notifications` sub-group is the last of `Advanced` in the Settings tab (`ui#panel/Settings`), with its subtitle, `ntfy Server` and then `ntfy Topic`, both text `Input` fields like the other free texts, followed by the token and the test of the sections below. It never appears in the setup wizard nor in its summary.
- Descriptions, in English, following the tooltip rule of `ui#General`: `trama.ntfyServer` «Server that receives Trama's notifications. The default is the public ntfy.sh.»; `trama.ntfyTopic` «Topic for a notification when omp Chat jobs finish or wait for you. Empty (the default) sends nothing; on ntfy.sh anyone who knows it can read them.».
- An invalid value shows under its field, like the other invalid values: `Enter an http or https address without user name or password.` for the server, `Use 1 to 64 letters, digits, - or _.` for the topic.
- All these texts are in English and do not follow `trama.language`.

## notice
- Every text of a notification is in English and does not follow `trama.language`. `<project>` is the name of the project's folder; `<name>` is the name of the conversation (`rules#agent-terminal`), for example `Scan`, `Design`, `T3` or `Run all`.
- Finished, one job: title `<project> - <name> finished`, message `Trama is waiting for you.`, tag `white_check_mark`, priority 3.
- Finished, more jobs: title `<project> - <n> jobs finished`, with the same message, tag and priority.
- Question: title `<project> - <name> asks a question`, message `The agent is waiting for your answers.`, tag `question`, priority 4.
- Permission: title `<project> - <name> asks permission`, message `The agent is waiting for your approval.`, tag `closed_lock_with_key`, priority 4.
- Stopped: title `<project> - <name> stopped`, message `The agent stopped before finishing its work.`, tag `warning`, priority 4.
- Test: title `<project> - Test notification`, or `Trama - Test notification` without a project, message `Trama's notifications reach this device.`, tag `bell`, priority 3.
- ntfy shows each tag as its emoji in front of the title (✅, ❓, 🔐, ⚠️, 🔔). A notification has no click action, no buttons, no attachment and no Markdown, and never contains what the agent wrote or asked, a command, a path, an answer, a card, the server, the topic or the token.

## developer.SET_NTFY_TOKEN
- Under `ntfy Topic`, with a token saved, a line in secondary text `Access token saved`, with no icon and no part of the token; without a token the line is not there and leaves no empty space.
- Then the buttons, small, wrapping inside the column at any width from about 300 px: `Set access token`, or `Change access token` with a token saved, `Button` of shadcn/ui in the `outline` variant with the lucide icon `KeyRound` left of the text; with a token saved, after it, `Remove access token`, `Button` in the `ghost` variant with the lucide icon `Trash2`.
- Tooltips and accessible names: the token button has the tooltip «Save the access token of your ntfy server» and the accessible name `Set ntfy access token` or `Change ntfy access token`; `Remove access token` has the tooltip «Remove the ntfy access token saved in Trama» and the accessible name `Remove ntfy access token`. No tooltip appears by itself.
- The masked box of the editor: title `ntfy Access Token`, prompt `Paste the access token of your ntfy server.`, and `Enter an access token.` for an empty text.
- After saving or removing, the focus goes back to the token button.

## developer.SEND_TEST_NOTIFICATION
- After the token buttons, on its own row, `Send test notification`, `Button` in the `outline` variant, small, with the lucide icon `BellRing`. When it is unavailable it is disabled and its tooltip says why: `Set an ntfy topic first.` with an empty topic, `Fix the ntfy server or topic first.` with an invalid value. While a test is being sent the icon is `Loader`, spinning, and the button is disabled.
- Below the button a line in a region `aria-live="polite"`: `Test notification sent.` in secondary text, or `Test notification not sent: <reason>.` in the error color, with the reasons of `rules#developer.SEND_TEST_NOTIFICATION`. The line is replaced by the next test and disappears when the tab closes.
- All these texts are in English and do not follow `trama.language`.
