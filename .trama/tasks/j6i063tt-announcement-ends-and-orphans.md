---
column: done
technical: false
refs:
  - announcement
  - requirements/rules#announcement
drift: null
proposal: kv1x3wmx
agent: false
created: 2026-10-24T14:42:09.104Z
finished: 2026-10-24T15:36:25.410Z
---
# Ghosts end with omp turns

The Announcement's ghosts end exactly when the work behind them ends, in omp Chat conversations as in terminals, and a window that opens never withdraws what is still alive.

- **omp-acp.TURN_ENDED**: when omp answers the prompt of an omp Chat job conversation with the end of the turn (`session/prompt` response with a `stopReason`, no developer message waiting), every announcement of that conversation still waiting is withdrawn at once with the notice that the agent finished without delivering what it announced, as for an idle hook in a terminal; a work (`kind: work`) is instead delivered, its ghost gone with no notice. Ask more and General produce no TURN_ENDED. In conversations (`TRAMA_ACP=1`) the hook no longer reports idle or started, so `endAgentWork` in `extension/src/host/agent.ts` is driven by the prompt answer, not by `trama hook idle`. The omp terminal path is unchanged: `agent-hook.IDLE`, `terminal.COMMAND_ENDED` and `terminal.CLOSED` keep withdrawing (or delivering a work) as today.
- **Only agents Trama started announce**: `trama announcement new` is accepted only with `TRAMA_TERMINAL`, which every Trama terminal and every omp Chat conversation, General included, has; anyone else is refused and no ghost is born. `trama proposal new` without it creates the Proposal without announcement and without error; `trama comparison new` without it gives the briefing with no ghost. An announcement Trama makes at launch (`announceLaunch`) belongs to the terminal or conversation it writes the instruction to.
- **Opening or reloading a window** withdraws only orphan announcements: those with no terminal, and those whose terminal or conversation the window is not about to resume and that no other open window follows, with the notice of an announcement not delivered (none for a work). `watchAnnouncements` in `extension/src/host/announcements.ts` no longer withdraws everything at activation (`withdrawAll`, today called at `main.ts:67` before the conversations are resumed): it waits until the window has read the conversations it will resume and its General, then asks the other windows with `followed-holders`, as the execution check does, and for holders no window follows decides from the process recorded in the per-user registry (pid and start time). Each window counts its own General among what it follows. The announcements of a conversation being resumed stay with their ghosts while its session reopens, and are withdrawn as for a lost agent only if it does not reopen. A second window on the same project never withdraws what the first one follows.
- **time.CHECK_DUE**: while a window lives, the execution check withdraws (or, for a work, delivers without its own notice) the announcements whose terminal or conversation no open window follows and whose recorded process no longer exists, recognised by pid AND start time; a window that does not answer in time follows nothing.
- **Notes, phases, bindings and deliveries** arriving together from the agent and its sub-agents are all kept; one that arrives for an announcement already delivered or withdrawn changes nothing, never brings the ghost back, and the agent is told with an error that the announcement no longer exists.
- Everything else in the Announcement stays as the Model states it (kinds, columns and status bar, take-over at launch, checks and their phases, comparisons, works, notes).
