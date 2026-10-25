---
refs:
  - developer.LOG_OUT_PROVIDER
  - panel/Settings
  - setup-wizard/omp
  - requirements/rules#developer.LOG_IN_PROVIDER
  - requirements/rules#developer.LOG_OUT_PROVIDER
  - requirements/rules#developer.SET_CURSOR_API_KEY
  - requirements/rules#setup-wizard
  - requirements/ui#developer.LOG_IN_PROVIDER
  - requirements/ui#developer.LOG_OUT_PROVIDER
  - requirements/tech#developer.LOG_OUT_PROVIDER
  - requirements/tech#developer.SET_CURSOR_API_KEY
  - requirements/quality#developer.LOG_IN_PROVIDER
---
# Log out of providers

When this Task is done, the developer can make omp forget the stored accounts of a model provider from the Providers section, both in the omp group of the Settings tab and in the `omp` step of the setup wizard (the same `Providers` / `ProviderRow` component of `extension/src/webview/setup-shared.tsx`).

## The button
- `Log out` appears on a provider's row only when the row is Connected (omp's models list has at least one model whose provider is the row's id, `providerConnected` in `extension/src/omp-login.ts`). A row not connected or of unknown state has no `Log out`. Only the providers of the fixed list `OMP_LOGIN_PROVIDERS` have rows.
- It is a shadcn/ui `Button`, `ghost` variant, small, with the lucide `LogOut` icon left of the text «Log out», placed right after «Log in again» in the row's button group (on the Cursor row after «Log in again» and before the API key buttons). Tooltip «Make omp forget its accounts of <short name>»; accessible name «Log out of <short name>». In panels narrower than about 480 px it wraps below name and state with the other buttons, without leaving the column. No tooltip shows by itself. Its appearing/disappearing does not change other rows' height nor move the focus (except as described under Running). All texts in English, independent of `trama.language`.

## Confirmation
- The click first opens a modal editor warning (`showWarningMessage` with `modal: true`): message «Log out of <short name>?», detail «omp forgets every account of <short name> it stored. Credentials in environment variables, `.env` files or `models.yml` stay.», button «Log out» (the editor adds its own Cancel). Closing it (Esc, close button, Cancel) does nothing at all. No repository file and no webview message can log out without this confirmation.

## The command
- Confirmed, the host runs, without terminal and without shell, `execFile(<program>, ["auth-broker", "logout", <id>], { timeout: 30000 })`. `<program>` is found by `findOmp` for the message's `ompPath` (wizard: the `omp` step's path, even unsaved) or for the saved `trama.ompPath` (Settings tab). `<id>` is taken from `OMP_LOGIN_PROVIDERS` (via `ompLoginProvider`), never the message text as is.
- Its environment is like every other omp process: the PATH of `ompPathVariable` plus the environment of the Cursor API key module (`cursorKeyEnv()` in `extension/src/host/cursor-api-key.ts`, giving `CURSOR_ACCESS_TOKEN` when a key is saved, placed after the inherited environment so it wins) — i.e. the same as `ompTerminalEnv` in `extension/src/host/agent.ts`. The key never goes in the arguments.
- omp removes every credential it stored for that provider (OAuth logins and keys saved by its login). It never removes environment variables, `.env` files, keys in omp's model settings (`models.yml`), nor Trama's Cursor API key: Log out never touches the key saved in Trama's secret storage.
- Only the exit code and the error output are read (for the failure reason); standard output is not read. Trama never reads omp's credentials or accounts.
- Supported by omp 18.12.6, the minimum Trama already requires; no version change.

## Messages
- Webview → host: `ompLogout { provider: string, ompPath?: string }` in `extension/src/protocol.ts`, validated in `parseToHost` (`extension/src/host/messages.ts`) like `ompLogin`: `provider` must be an id of `OMP_LOGIN_PROVIDERS`, `ompPath`, when present, a string. Settings sends it without `ompPath` (`extension/src/webview/settings/index.tsx`), the wizard with the step's path (`extension/src/webview/wizard/controller.ts`, next to `login`). The controller (`extension/src/host/controller.ts`, next to `ompLogin` and its dispatch) shows the confirmation and runs the command.
- Host → webview: `ompLogoutState { provider: string, running: boolean }`, sent with `running: true` right after the confirmation and with `running: false` once the following `refreshOmp(true)` and `checkAgent` (with the logout's path, as after `loginOmp`) have answered. Both Settings and wizard pass this state into `Providers`.

## Running state
- While the command and the following check run, that row's `LogOut` icon becomes the lucide `Loader` spinning (also with `prefers-reduced-motion`), the text stays «Log out», every button of that row (Log in again, Log out and, on the Cursor row, the API key buttons) is disabled and marked so for assistive technologies, and the row has `aria-busy="true"`. Other rows stay usable. A second click on the same row is impossible until the check ends.
- When the check ends, focus goes back to «Log in» or «Log in again» of the same row.

## Failure
- The command fails when it exits with a non-zero code, cannot start, or has not finished within 30 seconds (then it is stopped). A failure shows the editor error «Trama: could not log out of <short name>: <reason>.», where the reason is the last non-empty line of omp's error output, or, without one, `exit code <n>`, `could not start omp` or `timed out`.

## Re-checks
- Whatever the outcome, Trama then redoes the same checks as at the end of a login terminal: the Settings tab's check (omp status, number of models, connected providers, model suggestions) and the wizard `omp` step's check with the program used by the logout, when they are open. The wizard's `omp` check is also redone when a logout ends (with the update check of `rules#agent-terminal` as on every check of the step). If no usable model is left, the wizard's `Next` of the `omp` step becomes unavailable as for any check. The wizard's choices stay, and `Cancel` does not undo the logout. The Settings tab blocks nothing.

## Still connected
- After a successful logout (exit code 0), when the check made with the same program still lists the provider among the Connected ones (`providers` of that answer contains the id), Trama shows once the editor information message «Trama: <short name> is still connected through another credential (environment variable, `.env` file or `models.yml`). Remove it there to disconnect.». On the Cursor row with a saved Cursor API key the message is instead «Trama: Cursor is still connected through the Cursor API key saved in Trama or another credential. Remove them to disconnect.»; the key stays. With the models list in error (`providers` absent, unknown state) no notice shows. No message confirms a logout that disconnected the provider: the row just says «Not connected».

## Tests (`bun:test`)
`parseToHost` accepts a list id for `ompLogout` and refuses an unknown one; a refused confirmation does nothing; the command's program, arguments and environment (with `CURSOR_ACCESS_TOKEN` when a key is saved, never in the arguments); failure by exit code, start error and timeout with their reasons; checks redone after success and after failure; the notice only when the provider is still Connected after a success, with the Cursor text when a key is saved; the Providers section with `Log out` only on Connected rows, the spinner and the disabled row while running, focus back on the login button. Existing suites to extend: `test/host-agent-terminals.test.ts`, `test/host-messages.test.ts`, `test/host-setup-wizard.test.ts`, `test/webview-providers.test.tsx`, `test/webview-settings.test.tsx`, `test/wizard-view.test.tsx`.

## Docs
`README.md`, `extension/README.md` and `CHANGELOG.md` describe logging out of providers (what omp forgets and what stays). `docs/uat.md` gets steps to try it (near X14–X14e), including a provider also reachable through an environment variable, so the still-connected notice shows.
