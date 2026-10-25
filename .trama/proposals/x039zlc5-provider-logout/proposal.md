---
status: approved
requires:
  - uw6vjpry
base:
  actors/developer.md: 5e8325da94fcb321ddc894016f8c5fbeb2e7a3831d2669e7acf611e214540b9b
  editor-panel/panel.md: dd96a69e64bbce6cce0b769def629aafa49c6e73c75c7fc3e3c733857c6695e6
  project-setup/setup-wizard.md: 72131b8eefa6e48ec738a2508e32bc5d2ab2034397bc3ab07f061de1c93ff749
  requirements/rules/omp-login.md: c2b115ca1a28225ce2600a99e027181eb65ba4080e59c8352ea89ec0da12854b
  requirements/ui/omp-login.md: 12c799c8ff4a356f45eee93b931652297a16dd04e546816b302fa5abfc6f71e1
  requirements/tech/omp-login.md: d769d90b43e8b461c577a576b27affc3d5d2735d32df110c84cb5ba4e341ad09
  requirements/quality/omp-login.md: be7d8b45c3a745c60a1db441a2543b2ba5829edca8a8692a1f8b1e82f582ea15
  requirements/rules/setup-wizard.md: 131777182ce5b1a7cda5c4c35ea5a8af67092e620d55af7a62da1939d4a26649
delete: []
created: 2026-10-25T06:23:48.746Z
label: Provider logout
---
# Provider logout

The developer's design request asks to allow logging out of the model providers. Today the Providers section of the Settings tab and of the omp step of the setup wizard only offers Log in, and the Model says Trama never logs out of a provider.

## Decisions

- A Log out button appears on Connected provider rows only, in the Settings tab and in the omp step of the wizard (the same component).
- Log out runs omp's logout of that provider silently in the background (omp forgets every account of it it stored), then re-checks omp as after a login terminal. omp 18.12.6, the minimum version Trama already requires, has the command.
- A modal confirmation comes first: «Log out of <name>?» with detail «omp forgets every account of <name> it stored. Credentials in environment variables, `.env` files or `models.yml` stay.» and the button «Log out»; closing it changes nothing.
- While the command and the re-check run, Log out shows a spinning loader and the buttons of that row are disabled; the other rows stay usable.
- A failure shows the editor error «Could not log out of <name>: <reason from omp>.» and omp is re-checked anyway.
- When the re-check still finds the provider Connected after a successful logout, an editor message says «<name> is still connected through another credential (environment variable, `.env` file or `models.yml`). Remove it there to disconnect.»
- On the Cursor row, Log out touches only omp's credentials: Trama's Cursor API key stays, removed only by Remove API key, so the row may stay Connected through it (and the notice above says so).
- The button is a ghost button with the `LogOut` icon and the text «Log out», right of Log in again, with the accessible name «Log out of <name>».

## Already present

- `panel/Closed/developer.SHOW_SETTINGS` — `extension/src/menu-protocol.ts` `SHOW_COMMANDS` (`trama.showSettings`), `extension/src/host/controller.ts` `openSettings`
- `panel/Open/developer.SHOW_SETTINGS` — `extension/src/menu-protocol.ts` `SHOW_COMMANDS`, `extension/src/host/controller.ts` `openSettings`
- `panel/Closed/developer.OPEN_GUIDED_SETUP` — `extension/src/host/controller.ts` `openSettings` with `guidedSetup`, `extension/src/webview/settings/index.tsx`
- `panel/Open/developer.OPEN_GUIDED_SETUP` — `extension/src/webview/main.tsx` `guidedSetup` → `settings.openGuidedSetup`
- `setup-wizard/Closed/developer.OPEN_GUIDED_SETUP` — `extension/src/webview/wizard/controller.ts`, `extension/src/webview/settings/index.tsx` (Guided setup)
- `setup-wizard/Path/developer.NEXT_SETUP_STEP` — `extension/src/webview/wizard/logic.ts` (step order and `Next` validity)
- `setup-wizard/Models/developer.PREVIOUS_SETUP_STEP` — `extension/src/webview/wizard/logic.ts` `previousStep`
- `setup-wizard/Models/developer.OPEN_SETUP_STEP` — `extension/src/webview/wizard/logic.ts` `openStep`
- `setup-wizard/Project/developer.OPEN_SETUP_STEP` — `extension/src/webview/wizard/logic.ts` `openStep`
- `setup-wizard/Folders/developer.OPEN_SETUP_STEP` — `extension/src/webview/wizard/logic.ts` `openStep`
- `setup-wizard/Advanced/developer.OPEN_SETUP_STEP` — `extension/src/webview/wizard/logic.ts` `openStep`
- `setup-wizard/Summary/developer.OPEN_SETUP_STEP` — `extension/src/webview/wizard/logic.ts` `openStep`
