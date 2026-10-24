---
created: 2026-10-23T14:34:47.929Z
updated: 2026-10-23T14:34:47.929Z
summary: Prima di ogni lancio Trama controlla e aggiorna omp, avvisa quando manca e offre Install omp con il terminale dell'installer ufficiale.
tasks:
  - 0a7k42wl
  - 4wmvv8d3
  - j5p99zl4
cleared:
  4wmvv8d3:
    title: Install omp
    proposal: 3xin5lv7
    tag: omp install/update
    finished: 2026-10-23T14:30:55.447Z
    refs:
      - developer.INSTALL_OMP
      - requirements/rules#developer.INSTALL_OMP
      - requirements/ui#developer.INSTALL_OMP
  0a7k42wl:
    title: omp prima dei lanci
    proposal: 3xin5lv7
    tag: omp install/update
    finished: 2026-10-23T14:29:40.238Z
    refs:
      - agent-launching
      - agent-terminal
      - requirements/rules#agent-terminal
      - requirements/tech#agent-terminal
      - requirements/ui#agent-terminal
      - requirements/tech#agent-launching
      - specs#infrastructure
  j5p99zl4:
    title: Qualità di omp
    proposal: 3xin5lv7
    tag: omp install/update
    finished: 2026-10-23T14:21:35.115Z
    refs:
      - requirements/quality
---
# omp installato e aggiornato

Ogni lancio cerca omp, controlla gli aggiornamenti al massimo una volta all'ora e aggiorna in automatico; se omp manca il lancio non parte e compare l'avviso con Install omp e Open Settings. Install omp apre un terminale con l'installer ufficiale e, a fine comando, Trama rifà la verifica. Le regole di qualità di omp sono scritte in documenti, Specs e acceptance.
