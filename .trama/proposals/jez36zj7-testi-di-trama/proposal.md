---
status: approved
requires:
  - q51924cv
  - 165u7rro
  - drdvf0p2
base:
  requirements/rules/general.md: d0997453da9572f876281ed4c6371946230547751633034de63b1a3465f538e4
  requirements/rules/questions-notices.md: ecb27b7e362a7ffe5238b952f17899e6a871d345e6feb779a3e457d3da5ce16c
  requirements/tech/questions-notices.md: 13ec465ece9ef56faf856eb98fc2c6c162c4354dc7befdf10e07a85bd28adc94
  requirements/tech/general.md: 2655cf34970202ec1686c0fbc2ebcc28616cefd578eccf2447f00eaaa010c93f
delete: []
created: 2026-10-22T05:37:02.623Z
label: Testi di Trama
---
# Testi di Trama

Due regole di scrittura per i testi che l'agente scrive per Trama: Trama si chiama sempre «Trama», mai in prima persona; e ciò che il developer legge in una domanda o in un Task si capisce da solo, senza la conversazione dell'agente.

## Decisioni

- La regola «Trama, mai I» vale per i testi che l'agente scrive per Trama (domande e opzioni, Proposal, Task, Drift, voci di History) e per ogni testo nuovo dell'interfaccia e della riga di comando; non per le risposte dell'agente nella conversazione.
- Vieta ogni prima persona: I/me/my e we/our, e in italiano «io», «noi» e i verbi alla prima persona; si scrive «Trama» o «l'agente».
- Testi autoconclusivi: le domande dei round (testo, contesto, opzioni) e i corpi dei Task.
- La regola delle domande sta nelle skill (sezione Asking) e nell'aiuto di `trama question new`; `context` resta facoltativo.

## Assunzioni da controllare

- La regola della prima persona entra nella sezione `## Language` di ogni skill che scrive testi per Trama, compresa `trama-setup`, che oggi non l'ha.
- I testi già scritti (Model, Requisiti, schede esistenti) non si riscrivono.
