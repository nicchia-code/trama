---
status: approved
base:
  project-setup/setup-wizard.md: 52e4cc408eebdf7d889f651e9754ed9e7291d11e96194613bf64b4282898d4a4
  agent-launching/agent-terminal.md: eb4c9eea467735be90b9aceb8a30017287ee8225140d7339bdb7db58da07d11b
  requirements/rules/setup-wizard.md: a2b5a1410b557575528c273b8e52b9460825b26f7c6d48b670804b3db4647368
  requirements/tech/setup-wizard.md: 9d550d06149682ceb4cc47cb4171e3a1932075bd1eac77930883beb619f0b965
  requirements/ui/get-started.md: 4fd550b47a1564e36d9653ba69f440a25c6d25da65ad9e6fa5a0445bd24e9558
  requirements/ui/settings-specs.md: 1aa9a485e18987edd189688233aa28acb877041a04ccb669b32cc6f27ee84eb2
  requirements/ui/agents.md: 2287880b7e08b8657f5a70cef3880d8696ade0066d01d2e5d87742d91f80fe15
  requirements/tech/settings.md: f9e8f191d561c9029195a3c21a4af3dd5e52ac1bf4292009b1eb7eba5860ac14
  requirements/quality/agents.md: 2381c0fbe85eb1670815fb1653fcf845742f66b6f6d337d2feb00988d58d8b23
  requirements/rules/instruction-files.md: new
  requirements/tech/instruction-files.md: new
  requirements/tech/models.md: f1716b37dc282eaf3172d8c5597f69cce63a5645ad97cac604826f08b41c0fe2
  requirements/quality/instruction-files.md: new
delete: []
request: 2026-10-21T23-54-34
created: 2026-10-21T22:30:20.299Z
label: Wizard di setup
---
# Consigli del wizard

Il wizard di setup guida le scelte principali ma non dice quale peso di modello conviene a ciascun ruolo, né avvisa quando il progetto o l'utente hanno file di istruzioni (AGENTS.md, CLAUDE.md, regole di Cursor…) che omp o la chat di Cursor caricano in ogni lavoro di Trama e che possono contraddirne le skill.

Decisioni dell'intervista:
- Consiglio dei modelli: solo una frase del passo Models, in tutti i modi del wizard, senza nomi di modelli: analisi col modello più capace, esecuzione con uno intermedio, scansione con uno veloce e leggero. Nessuna preselezione e nessun ordinamento dei suggerimenti.
- Testo del passo Models: «Choose the model for each kind of work. Analysis works best with your most capable model, Execution with a mid-range one, Scan with a fast, light one.»
- File cercati: elenco fisso, qualunque agente: `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.cursor/rules/`, `.agents/AGENTS.md`, `.omp/AGENTS.md`, `.omp/RULES.md` nella cartella del progetto.
- Cartelle sopra il progetto: solo `AGENTS.md` e `CLAUDE.md`, fino alla cartella home esclusa.
- File utente: `~/.omp/agent/AGENTS.md`, `~/.omp/agent/RULES.md`, `~/.agents/AGENTS.md`, `~/.claude/CLAUDE.md`, `~/.cursor/rules/`.
- Un file vuoto (o di soli spazi) non conta; le regole di `.cursor/rules/` compaiono un file per riga.
- L'avviso sta nel passo Agent, in tutti i modi, elenca i file con un link che li apre nell'editor e non ferma il wizard.
- Testo dell'avviso: «Agent instruction files found. The agent loads them in every Trama job: remove them from the repository, or check that they do not conflict with Trama.»
- Nuova impostazione `trama.ignoreInstructionFiles` (Ignore Instruction Files), casella del gruppo Agent dopo `trama.terminalLocation`, visibile solo con omp, spenta per default, anche nel passo Agent del wizard e nel suo riepilogo.
- Accesa, con omp, tutti i lanci di Trama (design, import, scan, Run, Resolve Drifts, sotto-agenti e advisor compresi) escludono gli stessi file dell'avviso; le regole di Cursor si escludono una per una, senza togliere a omp i server MCP di Cursor; le esclusioni che il developer ha già nelle configurazioni di omp si conservano. Con la chat di Cursor non ha effetto.
- Con omp e l'impostazione accesa l'avviso resta, con la nota «Trama's omp jobs ignore these files.».
- Il controllo compare solo nel wizard: nessun avviso sulla Board.
- Fumetto: «With omp: Trama's jobs ignore agent instruction files (AGENTS.md, CLAUDE.md, Cursor rules, .omp/RULES.md) in the project, the folders above it and your user folders. Off by default.»

Assunzioni (da controllare):
- Il controllo si rifà ogni volta che il passo Agent si mostra, sulla cartella del progetto (nel primo setup quella scelta in Path); non scende nelle sottocartelle del progetto.
- Un link apre il file in una scheda dell'editor anche quando sta fuori dall'area di lavoro; il wizard resta dov'è.
- Un progetto fuori dalla home non ha cartelle sopra da cercare; la cartella utente di omp è sempre `~/.omp/agent`.
- Nella scheda Settings la nuova casella si vede con ogni agente, come `trama.ompPath`; nel wizard solo con omp.
- Esclusione in omp con `disabledExtensions` in un overlay `--config` (lo stesso file dell'overlay dell'Advisor Scanner): `context-file:project|user:AGENTS.md|CLAUDE.md`, `rule:RULES@project`, `rule:RULES`, `rule:<nome>` per le regole di Cursor. In omp un'esclusione di progetto per `AGENTS.md` vale anche per gli `AGENTS.md` delle sottocartelle.
- `.cursorrules` compare nell'avviso ma non ha un'esclusione: omp 18.12.1 non lo legge.
- Le esclusioni del developer si leggono da `.omp/config.yml` del progetto o, se lì mancano, da `~/.omp/agent/config.yml`.
- Requisiti di qualità e tecnologia nuovi in frammenti propri (`instruction-files`), perché i frammenti di agent-launching e agent-terminal sono vicini ai 12 KB.
