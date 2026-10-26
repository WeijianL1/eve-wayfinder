# Issue tracker: Local Markdown

Issues and specs live as Markdown files in `.scratch/` and are versioned with the repo.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`.
- Spec: `.scratch/<feature-slug>/spec.md`.
- Tickets: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, one file per ticket.
- Record triage state with a `Status:` line near the top, using [triage labels](triage-labels.md).
- Append discussion under `## Comments`.
- Publishing means creating or updating these local files, creating directories as needed.
- Fetching means reading the referenced ticket file. Resolve issue numbers within the specified feature directory.

## Wayfinding operations

- Map: `.scratch/<effort>/map.md`, containing Notes, Decisions-so-far, and Fog.
- Child tickets: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body.
- Record `Type:` as `research`, `prototype`, `grilling`, or `task`.
- Record workflow `Status:` as `open`, `claimed`, or `resolved`. These are wayfinding states, separate from the triage roles above.
- Record dependencies as `Blocked by: NN, NN`. A ticket is unblocked when all listed tickets are resolved.
- Frontier: choose the lowest-numbered open, unblocked, unclaimed ticket.
- Claim: save `Status: claimed` before work.
- Resolve: append the answer under `## Answer`, set `Status: resolved`, and add a gist plus link to the map's Decisions-so-far.
