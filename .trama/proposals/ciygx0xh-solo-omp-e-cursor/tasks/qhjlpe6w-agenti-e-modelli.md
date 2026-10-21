---
refs:
  - agent-launching
  - requirements/tech#agent-launching
  - requirements/rules#agent-launching
  - requirements/ui#agent-launching
  - requirements/quality#agent-launching
---
# Agenti e modelli

Quando il Task è fatto, gli agenti supportati sono due: la chat di Cursor, solo in Cursor, e omp, in ogni editor. Claude Code e la chat di Copilot non esistono più per il lancio degli agenti e per i modelli.

- `trama.agent` vale `cursor` (predefinito) o `omp`; ogni altro valore, compresi i vecchi `chat` e `claude`, vale `cursor` senza avvisi e senza riscrivere l'impostazione. I ruoli dei modelli (`trama.analysis`, `trama.scan`, `trama.execution`) valgono con `omp` e con `cursor`.
- L'unica riga di comando del terminale è quella di omp (`omp --hook <modulo> [--model <m>] [--slow <scansione>] <prompt>`, e con l'Advisor Scanner `--advisor --config <overlay>`): sparisce la riga `claude --settings … [--agents <json>]` e la definizione inline di `trama-analysis` per Claude Code (`claudeAgents` in `extension/src/host/terminal-agent.ts`).
- Nella chat di Cursor il modello del ruolo passa solo con `composer.createNew` (`modelConfig`), come oggi. Sparisce la ricerca del modello fra quelli di Copilot (`copilotModelSelector` in `extension/src/host/agent.ts`) con il suo avviso `Trama: no Copilot model is named …`: Trama non controlla mai che un nome di modello esista. Il modello della corsa si passa a `launchAgent`, a `terminalRun` e a `openCursorChat` senza il nome di provenienza che serviva solo a quell'avviso.
- Con `cursor` in un editor che non è Cursor l'istruzione non parte, né da un pulsante né da un passo automatico della delega dei Drift: va negli appunti con lo stesso testo che riceverebbe la chat di Cursor e compare l'avviso della chat di Cursor fuori da Cursor (vedi il Task del terminale dell'agente per il testo e il pulsante); un passo automatico finito così si comporta come ogni istruzione finita negli appunti.
- La frase dei sotto-agenti ("Compare each Machine with the trama-analysis sub-agent.") vale per omp e per la chat di Cursor. Il sotto-agente `trama-analysis` della chat ha solo la definizione utente di Cursor (`~/.cursor/agents/trama-analysis.md`), scritta solo quando l'estensione gira in Cursor; la definizione di Copilot non si scrive più (la sua cancellazione è nel Task del progetto). `--slow` e la definizione di Cursor usano sempre `trama.scan`, anche quando la corsa usa il modello di una Proposal.
- Le descrizioni delle impostazioni in `extension/package.json` (`trama.analysis`, `trama.scan`, `trama.execution`, `trama.skillsDir`) non nominano più Claude Code, Copilot, il selettore dei modelli della chat di Copilot o `.claude/skills`, e dicono che il nome si scrive come lo accetta omp o la chat di Cursor e che al sotto-agente della chat di Cursor `trama.scan` arriva con Update skills.
- Sicurezza: nella riga di comando entrano, citati per la shell, solo i nomi dei modelli, il limite e il percorso del modulo dell'hook; nella definizione utente di Cursor il nome del modello è una stringa YAML citata.
- I test che fissano le righe di Claude Code, l'avviso di Copilot o il selettore dei modelli di Copilot (`test/host-terminal-agent.test.ts`, `test/host-agent-terminals.test.ts` per le parti di Copilot) si tolgono o si riscrivono per omp e Cursor.
