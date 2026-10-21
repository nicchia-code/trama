---
status: rejected
base:
  requirements/ui/settings-specs.md: afb2bfb22a6fefa7f3e42d9aef25edadc7e994c20b21ca599f25aa56a6e1d605
delete: []
created: 2026-10-21T04:43:38.376Z
label: Advisor Scanner text
---
# Testo Advisor Scanner

Il Requisito `requirements/ui#panel/Settings` cita la descrizione di `trama.experimentalAdvisorScanner` e dice che, in una sessione di omp avviata a mano, gli advisor di Trama «replace omp's default advisor and stay silent». La Proposal approvata n658x9k9 e il suo Task (qudyah8g) cambiano questo comportamento: gli advisor lanciano solo `trama advisor show` e poi tacciono. Il codice (package.json, README) segue già il nuovo testo; questa Proposal allinea la citazione nel Requisito.

## Decisioni

- Solo la frase finale della descrizione cambia: «...they replace omp's default advisor, run only `trama advisor show` and then stay silent.». Il resto del Requisito resta com'è.

## Feedback

Drift 6x21b4bd resolved by Proposal islis7ut
