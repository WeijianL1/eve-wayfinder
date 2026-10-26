# Token-efficient execution

- Start with a focused search for the files and evidence the task needs. Read relevant ranges with bounded output; expand only when a concrete gap remains.
- Keep tool results compact: request the smallest useful output, summarize large logs or data locally, and open full content only to diagnose a specific failure. For browser checks, inspect the relevant element or state instead of repeatedly returning the whole page tree or documentation.
- Run the checks appropriate to a change once. Repeat a check when code changes, it fails, or a remaining risk requires it; reuse recorded results otherwise.
- For long simulations and builds, let a script run in the background with progress logs, checkpoints, and fail-fast checks. Read concise progress at meaningful milestones or on failure, and give short user updates while work continues. Avoid repeated polling that only confirms the same state.
- Before another tool call, ask what decision its result will change. Batch independent reads, keep dependent edits sequential, and stop gathering evidence once the task's completion criteria are met.
- Treat token usage as a resource: frequent model turns resend long context, even when most input is cached. Keep context and status updates lean without reducing required implementation, testing, or honest reporting.

## Agent skills

### Issue tracker

Local Markdown under `.scratch/`. Read `docs/agents/issue-tracker.md`
before creating, fetching, or updating issues and specs.

### Triage labels

Use the five canonical labels defined in `docs/agents/triage-labels.md`
when triaging issues.

### Domain docs

Single-context layout. Read `docs/agents/domain.md`
before exploring or changing domain behavior.
