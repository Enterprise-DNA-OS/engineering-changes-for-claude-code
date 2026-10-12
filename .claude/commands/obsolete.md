# /obsolete

Run `npm run engineering -- obsolete --revision=<released-revision> --note=<reason> --actor=<operator>`. Add --json when processing the result.

Read CLAUDE.md first. Resolve the requested records from a read command. Replace placeholders with the user's supplied values, never guessed values. On ambiguity, show the candidates and obtain the exact ID. Present actual results and explain any gaps.

Only record approvals or evidence actually supplied by the user. Never impersonate a reviewer. Keep the release guards intact.
