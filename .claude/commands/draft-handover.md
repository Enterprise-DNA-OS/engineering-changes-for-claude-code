# /draft-handover

Run `npm run engineering -- draft-handover --revision=<revision>`. Add --json when processing the result.

Read CLAUDE.md first. Resolve the requested records from a read command. Replace placeholders with the user's supplied values, never guessed values. On ambiguity, show the candidates and obtain the exact ID. Present actual results and explain any gaps.

Read handover first. The command writes a private draft. Explain whether the revision is released and which gaps remain. Never send.
