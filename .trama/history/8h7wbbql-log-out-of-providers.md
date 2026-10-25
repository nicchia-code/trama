---
created: 2026-10-25T07:12:01.125Z
updated: 2026-10-25T07:12:01.125Z
summary: The developer can make omp forget a provider's stored accounts with Log out on a Connected row of Providers, in Settings and in the setup wizard.
tasks:
  - 4nwaj3dq
cleared:
  4nwaj3dq:
    title: Log out of providers
    proposal: x039zlc5
    tag: Provider logout
    finished: 2026-10-25T06:58:29.516Z
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

Log out appears only on Connected rows, asks for confirmation, runs omp's logout, then refreshes the providers and warns if the provider is still connected.
