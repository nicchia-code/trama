---
created: 2026-10-21T05:07:29.960Z
updated: 2026-10-21T05:07:29.960Z
summary: "Gli agenti supportati sono due: la chat di Cursor (solo in Cursor) e omp in ogni editor; escono Claude Code e la chat di Copilot, con hook, impostazioni, skill e documentazione."
tasks:
  - 0qb3t0da
  - dodhd3c3
  - ewimd8xh
  - ewtc84bi
  - febwzftr
  - hrelflvs
  - jotw5fvk
  - nz768be5
  - sjbbl34c
  - sp2gp6y4
  - uv02b9vs
  - ws19kk8g
---
# Solo chat di Cursor e omp

Il lancio degli agenti, i modelli, gli hook, le impostazioni, le skill, le domande e la documentazione (con una nuova ADR) seguono ora solo la chat di Cursor e omp. `trama.agent` vale `cursor` (predefinito) o `omp`: ogni altro valore, compresi i vecchi `chat` e `claude`, vale `cursor` senza riscrivere l'impostazione. Fuori da Cursor con l'agente `cursor` nessun lavoro parte: l'istruzione va negli appunti con un avviso e il pulsante Open Settings. La riga di comando del terminale è solo quella di omp, con il suo hook; spariscono gli hook di Claude Code e di Copilot, i loro suggerimenti di modelli e i Task presi dalla chat di Copilot. L'impronta del codice non esclude più `.claude/skills` e `.github/skills`.
