---
status: approved
base:
  agent-launching/agent-terminal.md: 517b5833c7b25f388242ef303caabf34afacb4a8ece6b8f21cf23a9edc530a83
  project-setup/setup-wizard.md: 1aecaf601bb8c512880980ec899ecde33833c097f78e3a7ddc83de5ffd2bfe3b
  requirements/rules/agent-terminal.md: b31d4bf0dee7007ee75c0a5a80ae4d438a772714c34c758431d9788263d65ab5
  requirements/rules/ask-more.md: a1695d46531d6e51190da11315020388ef1ad4fbe197a205bd37d1c83531e591
  requirements/rules/omp-chat-general.md: 17961cf31f709b2a41bfafe8bee2abadb5ef75245e6d8260bf4b30d7662f86fb
  requirements/rules/setup-wizard.md: 7c16eb5d0871b4b068b34cbf97c1c73e3ba7d2cad0a33af107ffe52c7b556e75
  requirements/tech/agent-terminal.md: 9dd79664a451930dc48f31df493876a39b657a61b8f10601bfcf91c09bc1a330
  requirements/ui/settings-specs.md: 0c241d20a9502d2f1c36a7bb58d60adc8842397460aad1b46aae3763064b9604
  requirements/ui/agents.md: 2df3c171eaf777465c41bb60f9327dc45c6bafb91b052b1bd31e089b564b1869
  requirements/tech/general.md: 871016701bf708d70fa6aeb7aba28d87f7fc3d20eb593f28fd7d82497584701f
  requirements/ui/setup-wizard.md: dab93a4262b958aa62708696cbc07c1363ac0c0f4576b4d4cf04dbabd526e2dd
delete: []
created: 2026-10-24T18:50:23.640Z
label: Language
---
# Lingua per lo sviluppatore

Riattiva l'impostazione `trama.language` con un confine netto: nella lingua scelta va ciò che è lavoro e conversazione per lo sviluppatore; resta in inglese ciò che è tecnico.

## Decisioni

- Lingua scelta: titolo e corpo dei Task, titoli dei gruppi di Task, titolo, corpo e Fix options dei Drift, titolo, introduzione e motivazione delle Proposal, domande e opzioni dei round, note dei ghost, voci della History, risposte dell'agente nei lavori e resoconto finale, risposte in General.
- Inglese: nome del System, nomi di Feature, Machine, Actor e State, ID ed Event, descrizioni nei file del Model, Requirements (titoli, corpo, Area), campo notes delle Specs, codice e commenti, commit, documentazione del progetto; come già oggi le intestazioni lette da Trama, i termini di Trama e l'interfaccia.
- La frase dell'istruzione è corta e rimanda alla sezione Language delle istruzioni; i testi fissi di Ask more, General e Unify Drifts ricevono la stessa sezione.
- General riceve la frase della lingua.
- Ask more risponde nella lingua in cui scrive lo sviluppatore; la lingua scelta vale per i testi che scrive per Trama.
- La lingua compare anche nel wizard, nel passo omp.
- Spiegazione dell'impostazione: «The language the agent writes tasks, drifts, proposals, questions and replies in, for example `Italian`. The Model, Requirements, Specs and code stay in English. Empty (the default) keeps English.»
- Cambiare lingua non traduce nulla di già scritto.

## Assunzioni

- Testo della frase: «Write the texts for the developer in <language>, as the Language section of your instructions says.»
