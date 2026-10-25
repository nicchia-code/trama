---
status: approved
base:
  solo-mode/feature.md: new
  solo-mode/solo-switch.md: new
  actors/developer.md: cac32cc71eb1df7cd8f373279e8934252c34130035b4c583f563ecbf1949b98d
  project-setup/setup-wizard.md: bb3087e5ef03c613689c317d25e44aba050b4c6c9e78e548a5eaa9978388264c
  editor-panel/panel.md: 52fc4a6e4adce50e5626fcb239fa084e6222c2d151b57480eadc4facccf4be00
  requirements/ui/solo-mode.md: new
  requirements/ui/get-started.md: b90ce55b9e375172d677e87845fd93ec8cad9bf474e5f0d3d7eb9dc05af90be1
  requirements/tech/solo-mode.md: new
  requirements/tech/general.md: cca5e80a513b6f556ffa873f1666171360afc121e1ecff9cd3acdf58546a4847
  requirements/data/solo-mode.md: new
  requirements/rules/solo-mode.md: new
  requirements/rules/setup-wizard.md: 7ee84fc2e6134150b46a1f4b302cb64fa93f9d90de1091b358bf968f145ef877
  requirements/quality/main.md: 83e253e1431266966b3b25d6912544d9eabdd5e37a8d1a152ff81f29e43cd0ae
  requirements/cli/main.md: 20075fb0840c24aca9a0511639d3cf7b6bd8267ee83edece6eddece8fab1bec4
  requirements/data/proposals.md: ca701309e306e6ba56ee89f38730da7402e9958b99231376d1fb09a25fdccbe8
delete: []
created: 2026-10-25T08:49:03.794Z
label: Solo mode
---
# Solo mode

Solo mode permette a un developer di usare Trama in un repository dove gli altri non lo usano: i file di Trama restano solo nella sua copia di lavoro e non entrano mai nei commit. Questa Proposal introduce la modalità, le sue esclusioni git e la sua scelta in Settings e nel wizard; il Merge del menu laterale arriva in una Proposal successiva che dipende da questa.

## Decisioni

- Nome: Solo mode.
- Vale solo per il workspace, mai per l'utente: il valore sta nel progetto, in un file locale dentro `.trama/` che ignora sé stesso, quindi resta locale anche quando `.trama/` è già tracciato. Non è una chiave di `contributes.configuration`.
- Si scrive con `trama project edit` (e `trama project new`), che scrive anche le esclusioni.
- Esclusioni in `.git/info/exclude`, mai in `.gitignore`, dentro un blocco fra `# trama solo mode` e `# end trama solo mode`; Trama riscrive o toglie solo quel blocco.
- Cosa si esclude è una scelta con default cartelle intere (`.trama/`, la cartella delle skill, `.omp/`); l'alternativa esclude solo i file che Trama scrive (`.trama/`, le skill `trama-*` comprese le `trama-req-*`, `.omp/agents/trama-analysis.md`, `.omp/agents/trama-implementer.md`, `.omp/WATCHDOG.yml`).
- Spegnere Solo mode toglie il blocco.
- File di Trama già tracciati: Solo mode si accende comunque e un avviso li elenca.
- Cartella che non è un repository git: l'interruttore è disattivato con il motivo `Solo mode needs a git repository.`
- Se il blocco viene cambiato o tolto a mano mentre Solo mode è acceso, Trama lo ripristina a ogni apertura ordinaria, come le skill.
- Scheda Settings: riga nel gruppo Project, sotto la cartella delle skill, con la nota `Only this workspace.`; la scelta delle esclusioni compare sotto l'interruttore quando è acceso.
- Wizard: Solo mode e la scelta delle esclusioni sono nel passo Project solo nei modi primo setup e Modello vuoto (import); nel Guided setup no. Con Solo mode scelto, l'avviso di Get Started dice che i file restano fuori da git.
- Backup di `.trama/`: rimandato; la spiegazione di Solo mode dice che `.trama/` non è versionato.

## Assunzioni

- Il file del flag è `.trama/solo/mode.json` in una cartella con il proprio `.gitignore` `*`, come le altre cartelle locali di `.trama/`.
- Il codice dell'impronta (`LEFT_OUT`) non cambia: Solo mode non tocca lo scan.

## Rifinitura

- Riportata sul Modello attuale: in `editor-panel/panel.md` la descrizione del Panel tiene il nome della scheda dell'editor come lo dice ora il Modello (il nome della vista mostrata), e le aggiunte di Solo mode in Settings e Get Started restano le stesse.
- In `requirements/ui/get-started.md` la sezione `panel/Get Started` tiene il titolo della scheda come lo dicono ora i Requisiti (`Get Started` o `Settings`); l'avviso di Solo mode resta lo stesso. I Task non cambiano.
