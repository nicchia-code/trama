# Requirements: Interfaccia, System certificates

Use when building the System Certificates setting, its state and Refresh, its command and warnings, or the text that tells a certificate error.

## developer.REFRESH_SYSTEM_CERTIFICATES

- `trama.systemCertificates` has the title `System Certificates`, is a `Checkbox`, off by default, and has the description, in English: «On: omp and your agent's commands trust the certificates your system trusts, for proxies that inspect HTTPS. Replaces `NODE_EXTRA_CA_CERTS`, `SSL_CERT_FILE` and similar variables.». It sits in the `omp` group of the Settings tab and in the wizard's `omp` step, last among their settings, with the same component in both.
- While the box is checked (in the wizard: checked in the step), under the description and before the other messages, one line of secondary text shows the state of the bundle, with an icon on the left and, at the right end of the same line, the `Refresh` button:
  - exporting: the spinner of the omp state and «Exporting system certificates…»;
  - ready: `CircleCheck` in the success colour and «<N> certificates, exported <date and time>.»;
  - failed with an earlier bundle: `TriangleAlert` in the warning colour and «Could not export the system certificates (<reason>). Using the ones exported <date and time>.»;
  - failed without a bundle: `TriangleAlert` in the warning colour and «Could not export the system certificates (<reason>). omp gets no certificates from Trama.».
  `<date and time>` is the time the bundle in use was written, in the editor's locale, short form. `<reason>` is one of: `could not start <program>`, `<program> exited with code <N>`, `the export did not finish within 30 s`, `no certificate bundle found` (Linux), `no certificate authority found`, `could not write the bundle: <message>`. While the box is unchecked the line and the button are not shown.
- `Refresh` is a small outline button with the lucide icon `RefreshCw` on the left of its text; accessible name `Refresh system certificates`. During an export it is disabled and its tooltip says «Exporting system certificates…». When the line does not fit, the button wraps under the text, aligned left; nothing overlaps at any width from about 300 px.
- The palette command is `Trama: Refresh System Certificates`, shown only while `trama.systemCertificates` is on. Its outcome is an editor message: «Trama: exported <N> system certificates.» on success, or the error message «Trama: could not export the system certificates: <reason>.» on failure, followed by « Using the ones exported <date and time>.» when an earlier bundle stays in use.
- An automatic export that fails (at the start of the extension) shows once the editor warning «Trama: could not export the system certificates: <reason>.», with the same follow-up when an earlier bundle stays in use, and the button `Open Settings`, which opens the panel on the Settings tab.
- The state line reads in words, never by colour alone, and is linked to the checkbox with `aria-describedby`; a change of state is announced politely (`aria-live="polite"`).
- Certificate error text (`rules#developer.REFRESH_SYSTEM_CERTIFICATES`). With the mode off it is «omp could not verify a server's certificate; a corporate proxy that inspects HTTPS traffic is the usual cause»; with the mode on it is «omp could not verify a server's certificate, even with System Certificates on; a corporate proxy that inspects HTTPS traffic is the usual cause». It is a phrase without a final full stop, so each place uses it where it put the reason:
  - omp state of the Settings tab and of the wizard's `omp` step, and the reason line of the models list: the text, with a final full stop;
  - failed update in the wizard: «Could not update omp (<text>). omp <version> answered with <N> models.»;
  - failed logout: the editor error of `ui#developer.LOG_OUT_PROVIDER` with the text as its reason;
  - usage line under the message field of omp Chat: the text in place of the usage error;
  - notices on the Board (`ui#agents`): `The agent of <job> stopped: <text>.` in place of `omp refused the prompt (<message>)`, and `Trama stopped following <job>: <text>.` in place of `omp exited (<code or signal>)`; the last lines of omp's error output stay in the block that opens with `Show details`;
  - a conversation that does not start and falls back to the terminal: the notice's reason is the text, and omp's lines stay where the notice already shows them;
  - General: the reason line inside the conversation is the text, followed by omp's lines as before.
- Every text of this fragment is in English and does not follow `trama.language`. The text never names a product and never suggests turning System Certificates on.
