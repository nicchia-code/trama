---
status: approved
base:
  requirements/rules.md: 90e5acf3d1292cc7979b914cb01565bf092f61d243825a3f68637e9f396f2706
  requirements/tech.md: 5dc59b635503a88a5b8afb1ee1748559d7d44aaa537b936a803391e47f33f3ec
  requirements/ui.md: 2299f890bd95326ce7924e9b6c08a883e284fe10898897419ce548264dd1982b
delete: []
---
# Runs pick the next runnable Task and skip blocked ones

Run all To do and Run this design no longer take the Tasks in the order they arrived and stop at the first Drift. Each time, the run takes the next runnable Task: the lowest-numbered Task in To do that is not blocked, recomputed after every Task, so a Task that fixes a Drift runs before the origin Task waiting for it. Blocked Tasks are skipped and reported; a Drift filed during the run does not end it. This replaces Proposal 0023. Only Requirements change, because the Model does not describe runs. Decisions for the developer to check (beyond the interview): the command that names the next Task is `trama task next [--proposal <id>]`; when none is runnable it prints that, and lists the blocked Tasks with their reason; a single requested Task that is blocked is still refused and ends that request.
