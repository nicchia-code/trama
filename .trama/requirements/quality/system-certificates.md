---
description: "Use when work on System Certificates or on certificate error messages touches security, privacy, reliability or accessibility."
---
# System certificates

## developer.REFRESH_SYSTEM_CERTIFICATES
- Security: Trama never turns off the checking of certificates, in any mode and as no fallback: it never sets `NODE_TLS_REJECT_UNAUTHORIZED`, `GIT_SSL_NO_VERIFY`, `PYTHONHTTPSVERIFY=0` or similar, never passes `-k`/`--insecure` to a command, never writes `strict-ssl=false` or the like in any configuration.
- Security: the bundle holds only certificate authorities that the machine trusts for every user (macOS system keychains, Windows `LocalMachine`, the Linux system bundle) plus the public roots of the runtime; a store that a single user can change without administrator rights is never read. No file of the repository, no workspace setting and no message of the webview chooses the sources, the bundle's path, the variables or the processes that receive them; the webview can only ask for an export, and only while the mode is on.
- Security: the export runs without a shell, with fixed programs and arguments; the bundle is written atomically in the user's own cache folder, never in the project or in `.trama/`.
- Privacy: the export never leaves the machine and Trama makes no network call for it; the bundle holds public certificates only, no keys. The certificate error test reads omp's error output in memory only, and only the fixed text of `ui#developer.REFRESH_SYSTEM_CERTIFICATES` is added to what the panel shows.
- Reliability: an export never blocks the activation of the extension, the panel or a launch; it has at most 30 s; a failed or timed-out export leaves the earlier bundle untouched; a process never reads a half-written bundle. Two windows exporting at once leave one whole bundle.
- Reliability: with the mode off, the environment of every process is exactly what it is without this feature.
- Accessibility: the state of the bundle reads in words, not by colour or icon alone; `Refresh` has an accessible name and works from the keyboard; changes of state are announced politely.
