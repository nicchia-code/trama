---
status: approved
base:
  system.md: 80597b622b3d6b428463f9ba7a58a0542511b5af2f5885e8074e4adf6096af7f
  pr-check/feature.md: 608c09ad107c0971472c6e1f6c0bdd846c31dc15cebd50b785b8723c8cc6c32c
  pr-check/pull-request-check.md: 76bdd14adf72604d5f0f282d4470a2b780b1190b310c2b68541bb8c2174d52e8
  pr-check/pull-request-report.md: d8ca1d8b243ca0c6a50b4611cc8f12c2dd928e747a7ed5125b888e2484993d0b
  editor-panel/feature.md: fb2ea8120ceec65c03818c63c87e9c9457b625af7df0e05398c5a8517efd5072
  editor-panel/panel.md: 00a71e4f77cdde1dfbad3c12290722107561185889036038b1c054b1c52b034e
  editor-panel/menu-laterale.md: 0149b752751488569cd1ea10a04f3ed812115abc49f05554910be5dca30a139c
  actors/developer.md: b72fa5cf38031c75173ff486a807910ddf800e0b1dec03450a5cd07a1ccd89e3
  actors/github.md: 761f5de661889a9863e3bcb6fdee3326497b895ff706a57de013328e31f1d54f
  team/feature.md: 4b543e6246e8def7321d1f79712659c5708e0ad77f7841a9d371f157b9c04147
  team/manager-mode.md: 90311544c2534b65e751986bf4bcbaaec66691e7190a34a33c1583bbd03503e4
  requirements/rules/team.md: 24ebbe361de6b8c91fee7a0741b3cd88627e5e51709e49d510ad4951db653b61
  requirements/rules/pr-check.md: 18d6a47d29e9969e23ca14bc6ad01e18be6b490f6119402c4a5634ce6ff02650
  requirements/ui/team.md: 4b173bbe7c60aceb2a0a94611ff5d2a97fd3eb333de4ad6fb69cc820c1877e0c
  requirements/ui/pr-check.md: 5fb5abb93c39567a5f86176bb762b3555e7babde946d71355530f316aaf05d09
  requirements/ui/menu-laterale.md: 8f8aa89a82e29eb081ef054aa57b3b4d01472023a3c411980837ccf806f56faf
  requirements/tech/panel.md: 92d98f0d5dac0aa057ac5db63b13e3b60911ac8b5d64f5e13ca664a29d90cde1
  requirements/tech/menu-laterale.md: b5220e67b976f589d8bb6e534efd84050cd9bf0ddeb46998c6923f8af9f9d1b8
  requirements/tech/pr-check.md: 03862074cee3317655ca443ac387d18d82fd73248032236e0d2463a0a7684552
  requirements/tech/general.md: 8548159fac3957ea8e08427a82bd2ea0283697a7f4dc46c4acbadd69110a06d7
  requirements/quality/agents.md: 9da7b3c8bde62596e391ff7e33106d0740dd17e1e3495f5b17aa68d0f47e35bb
  requirements/docs/readme.md: 17b73836e8175edcd2d08c0a8e2e0d34bc4c580b9fd402812c1e8f6935353c4c
  requirements/docs/website.md: 169b47b8bd639b52f5a824e3bc975c23abb6e49424cda9e60df6cc0216d7cae5
delete: []
request: 2026-10-28T17-53-24
created: 2026-10-28T17:05:01.044Z
label: PR Check nascosta
---
# Nascondere la PR Check

La PR Check viene nascosta per ora, solo lato interfaccia e utilizzo: il codice resta.

Decisioni:
- Nascosta e irraggiungibile: nessuna superficie la offre (niente scheda `Pull Requests`, messaggi `checkPullRequest`/`stopPullRequestCheck` ignorati) e Trama non legge più le pull request con `gh pr list`; codice core, host, webview e i loro test restano. Per riaccenderla serve una nuova Proposal.
- La vista Team torna a esistere solo con Manager mode acceso (come nella 0.1.1): voce `Team` del menu laterale, comando `Show Team` e vista solo con Team disponibile; spegnendo Manager mode con la vista aperta il pannello passa alla Board. Con Manager mode le schede sono Decisions, Issues, Timeline e People.
- Nel Modello e nei Requisiti la Feature `pr-check`, le sue Machine, i suoi Eventi e i suoi Requisiti restano, con una frase che dice che per ora è nascosta.
- I report già scritti in `.trama/pr-checks/` restano dove sono, né letti né cancellati; la rimozione dei worktree rimasti all'apertura del progetto continua.
- Documentazione: README, sito e guida non nominano più la PR Check (`gh` serve solo per Team); `docs/uat.md` tiene la sezione AU segnata come sospesa; una voce nuova del CHANGELOG dice che la PR Check è nascosta, la sezione 0.1.5 non cambia.

Assunzioni dell'agente:
- `tech#General` non cambia: il frammento supera già 12 KB con la sola sezione `General` e non si può dividere; elenca le chiamate di rete ammesse, e la PR Check nascosta semplicemente non ne fa (lo dicono `rules#pr-check` e `quality#agent-launching`).
