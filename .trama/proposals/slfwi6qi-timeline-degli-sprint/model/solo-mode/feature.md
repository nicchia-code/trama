# Solo mode

How a developer uses Trama alone in a repository where the others do not use it. With Solo mode on, Trama's files (the Model, the Requirements, the cards, the skills and what Trama installs for omp) stay only in the developer's working copy: Trama keeps them out of git with an exclusion that lives only in that copy and is never committed, so they never enter a commit and the shared repository sees only code.

Solo mode belongs to one working copy, never to the developer: it is not a user setting, and another clone of the same repository, even one with Trama, starts with it off. The developer turns it on and off in the Settings tab, or chooses it when the project is created. With Solo mode on, Trama's files are versioned nowhere: losing the working copy loses them.

With Solo mode on, the side menu also offers Merge: it brings into the current branch what the others committed, then has the agent compare the whole System with the code, so that every difference their work opened against the Model becomes a Drift on the Board. Since the others do not keep the Model up to date, those Drifts lean towards keeping the code and adapting the Model, except where the work came from an issue of Team: there the issue said what had to happen, so the Drift leans towards fixing the code (see the Issue).
