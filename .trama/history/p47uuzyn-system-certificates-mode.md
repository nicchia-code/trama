---
created: 2026-10-25T07:37:51.889Z
updated: 2026-10-25T07:37:51.889Z
summary: Opt-in mode that exports the system's trusted certificates for omp and its agents behind HTTPS-inspecting proxies, with controls in Settings and in the setup wizard.
tasks:
  - 5fajokd1
  - 2txdt6zz
  - b6ciq0h4
cleared:
  b6ciq0h4:
    title: Certificati nel wizard
    proposal: 6g3t97zq
    tag: System certificates
    finished: 2026-10-25T07:35:44.138Z
    refs:
      - setup-wizard
      - requirements/rules#setup-wizard
      - requirements/ui#setup-wizard/omp
  2txdt6zz:
    title: Certificati in Settings
    proposal: 6g3t97zq
    tag: System certificates
    finished: 2026-10-25T07:32:20.538Z
    refs:
      - panel
      - requirements/ui#panel/Settings
      - requirements/ui#developer.REFRESH_SYSTEM_CERTIFICATES
  5fajokd1:
    title: Export dei certificati
    proposal: 6g3t97zq
    tag: System certificates
    finished: 2026-10-25T07:30:10.223Z
    refs:
      - agent-launching
      - developer.REFRESH_SYSTEM_CERTIFICATES
      - requirements/tech#developer.REFRESH_SYSTEM_CERTIFICATES
      - requirements/rules#developer.REFRESH_SYSTEM_CERTIFICATES
      - requirements/quality#developer.REFRESH_SYSTEM_CERTIFICATES
      - requirements/tech#panel/Settings
      - requirements/ui#time
---
# System Certificates mode

The extension host can export the system certificate store into a per-user bundle and hand it to every process Trama starts (omp checks, login, install, update, job terminals, omp Chat) through the usual CA bundle variables. Certificate failures are recognised and told with a clear reason. Settings and the setup wizard's omp step show a System Certificates checkbox with the bundle status and a Refresh button; the wizard applies the value to its own checks before confirmation.
