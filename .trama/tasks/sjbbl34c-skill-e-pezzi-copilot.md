---
column: done
technical: false
refs:
  - project/Not a Trama project/developer.INITIALIZE_PROJECT
  - project/Trama project/developer.UPDATE_SKILLS
  - project/Trama project/developer.OPEN_PANEL
  - requirements/rules#project
drift: null
proposal: 2oj2rgp7
agent: false
created: 2026-10-21T04:57:27.914Z
finished: 2026-10-21T05:01:27.267Z
---
# Skill e pulizia di Copilot

Quando il Task è fatto, le cartelle delle skill che Trama guarda sono solo `.agents/skills` e la cartella configurata: `SKILL_DIRS` in `src/core/requirement-skills.ts` contiene solo `.agents/skills`, così `tramaSkillDirs` (rigenerazione delle skill di Requisiti, scritte solo dove c'è già `trama-design`) e `removeRetiredSkills` in `src/cli/skills.ts` (cancellazione della cartella `trama-fix`, qualunque cosa contenga, da `.agents/skills` e dalla cartella configurata) non guardano più `.claude/skills` né `.github/skills`: ciò che c'è resta com'è, nessuna rigenerazione e nessuna pulizia lì.

La definizione utente del sotto-agente di confronto si scrive solo in Cursor: `chatSubAgentFile` in `extension/src/host/chat-sub-agent.ts` perde il ramo di Copilot (`~/.copilot/agents/trama-analysis.agent.md`) e il parametro `cursor`, e produce solo `~/.cursor/agents/trama-analysis.md` col valore attuale di `trama.scan` (vuoto = eredita il modello della chat), qualunque sia `trama.agent`. `installChatSubAgent` in `extension/src/host/project.ts` non fa nulla fuori da Cursor. L'inizializzazione dall'editor (`initializeProject`) la scrive o riscrive in Cursor solo dopo aver creato il progetto, mai se l'inizializzazione è rifiutata o annullata, e non conta mai come conflitto; la definizione omp `.omp/agents/trama-analysis.md` resta invece un conflitto come i file delle skill.

Gli hook di Copilot non si installano più: si rimuovono `installCopilotHooks` e il suo uso in `installEditorHooks` (che installa solo gli hook di Cursor in Cursor; inizializzazione e Update skills non scrivono più nulla per Copilot). Al loro posto una funzione di rimozione dei pezzi di Copilot, usata sia da `updateSkills` sia da `checkSkills` (dall'editor, in ogni editor):
- cancella `~/.copilot/agents/trama-analysis.agent.md` se esiste, in ogni editor;
- fuori da Cursor, cancella il file `copilot-hooks.json` (`COPILOT_HOOKS_FILE`) nello storage globale dell'estensione se esiste, e da `chat.hookFilesLocations` delle impostazioni utente toglie solo la voce di quel file, lasciando intatte le altre (se la voce non c'è, l'impostazione non si tocca).
Restituisce ciò che ha tolto. In Update skills il resoconto aggiunge una riga per ogni pezzo tolto e tace quando non c'era nulla; la riga sul sotto-agente dice che la definizione della chat di Cursor è stata scritta, o perché no, e manca fuori da Cursor. In `checkSkills` togliere un pezzo di Copilot conta come aggiornamento (mostra `SKILLS_UPDATED`), una copia diversa del sotto-agente di Cursor si riscrive solo in Cursor, e un errore mostra l'avviso di errore a ogni apertura finché resta; gli hook di Cursor restano fuori dal controllo. `checkSkills` ha quindi bisogno dello storage globale (come `updateSkills`): adeguare i chiamanti. Dalla riga di comando (`trama project edit`, `trama project new`) non si tocca mai alcun file a livello utente: né la definizione utente né i pezzi di Copilot.

Test: in `test/host-project-hooks.test.ts` togliere i casi di `installCopilotHooks` e aggiungere quelli della rimozione (file e sola voce in `chat.hookFilesLocations` fuori da Cursor, file agente Copilot in ogni editor, nulla da togliere = nessuna riga); in `test/host-skill-check.test.ts` coprire il sotto-agente solo in Cursor e la rimozione Copilot che conta come aggiornamento; in `test/skills.test.ts` e nei test di `chatSubAgentFile` togliere le aspettative su `.claude/skills`, `.github/skills` e sul file agente di Copilot.
