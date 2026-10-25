# Away notifications

How Trama tells the developer who stepped away from the computer that it is his turn. When the developer has set an ntfy topic in his settings, each editor window sends a short notification to his devices when it has stopped working on the jobs it launched in omp Chat, when one of those jobs waits for an answer or a permission from him, and when the agent of one of them stops abnormally. The purpose is to bring the developer back when Trama is not working or needs an input; a notification that arrives a few seconds late is acceptable.

Only the jobs that run in conversations of omp Chat count: design, scan, Run, Resolve Drifts, Unify Drifts, import and refinement. Ask more and General never send anything, nor does a job that runs in a terminal, also when it went there because its conversation did not start. Every window sends only for its own conversations, so two windows never send the same notification. Nothing is sent when the window closes or reloads, nor when a conversation comes back after a reload: the developer is at the computer then.

A notification says only the project, the conversation and what happened, with an emoji and a priority for the kind of event; never what the agent wrote, asked or did. Without a topic Trama sends nothing and nothing changes. A notification that cannot be sent is tried once more and then given up in silence: it never disturbs the agent, the developer or the window. The Settings tab lets the developer send a test notification to check his configuration.

A notification changes nothing in the Model, the Proposals, the Tasks, the Drifts, the question rounds or the conversations: it only tells the developer that it is his turn.
