---
created: 2026-10-25T08:51:07.104Z
updated: 2026-10-25T08:51:07.104Z
summary: Trama avvisa il developer via ntfy quando un lavoro di omp Chat finisce, fa una domanda, chiede un permesso o si interrompe; impostazioni e prova nella scheda Settings, non nel wizard.
tasks:
  - 9b6rlvh6
  - 5crpt895
  - kbpowrod
cleared:
  kbpowrod:
    title: Wizard senza Notifications
    proposal: k6nrkrf9
    tag: ntfy
    finished: 2026-10-25T08:48:32.721Z
    refs:
      - setup-wizard/Advanced
      - setup-wizard/Project/developer.NEXT_SETUP_STEP
      - setup-wizard/Folders/developer.NEXT_SETUP_STEP
      - setup-wizard/Summary/developer.OPEN_SETUP_STEP
      - setup-wizard/Summary/developer.PREVIOUS_SETUP_STEP
      - requirements/tech#setup-wizard
      - requirements/ui#setup-wizard
  5crpt895:
    title: Notifications nelle Settings
    proposal: k6nrkrf9
    tag: ntfy
    finished: 2026-10-25T08:48:00.346Z
    refs:
      - panel/Settings
      - panel/Closed/developer.SHOW_SETTINGS
      - panel/Open/developer.SHOW_SETTINGS
      - panel/Closed/developer.OPEN_GUIDED_SETUP
      - panel/Open/developer.OPEN_GUIDED_SETUP
      - developer.SET_NTFY_TOKEN
      - developer.REMOVE_NTFY_TOKEN
      - developer.SEND_TEST_NOTIFICATION
      - editor.NTFY_TOKEN_CHANGED
      - requirements/ui#panel/Settings
      - requirements/ui#away-notifications
      - requirements/rules#developer.SET_NTFY_TOKEN
      - requirements/tech#developer.SET_NTFY_TOKEN
      - requirements/ui#developer.SET_NTFY_TOKEN
      - requirements/rules#developer.SEND_TEST_NOTIFICATION
      - requirements/tech#developer.SEND_TEST_NOTIFICATION
      - requirements/ui#developer.SEND_TEST_NOTIFICATION
  9b6rlvh6:
    title: Avvisi ntfy
    proposal: k6nrkrf9
    tag: ntfy
    finished: 2026-10-25T08:38:45.473Z
    refs:
      - away-notifications
      - notice
      - ntfy
      - time
      - omp-acp.PERMISSION_REQUESTED
      - developer.ANSWER_PERMISSION
      - requirements/rules#notice
      - requirements/tech#notice
      - requirements/data#notice
      - requirements/ui#notice
      - requirements/quality#notice
      - requirements/tech#away-notifications
      - requirements/data#away-notifications
      - requirements/quality#agent-launching
      - requirements/tech#General
---
# Notifiche ntfy

Ogni finestra dell'editor manda avvisi ntfy per i lavori di omp Chat avviati con l'hook di Trama, solo con un topic impostato. Gli avvisi sono quattro: fine, domanda, permesso e interrotto, con attese e annullamenti descritti nel Modello. Il sottogruppo Notifications della scheda Settings ha server, topic, token di accesso nel portachiavi dell'editor e il pulsante Send test notification; il wizard di setup lo salta.
