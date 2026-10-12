# /import

Run `npm run engineering -- import openbom --file=<csv-path> --assembly=<assembly-number> --code=<revision> --actor=<operator> --dry-run`. Add --json when processing the result.

Read CLAUDE.md first. Resolve the requested records from a read command. Replace placeholders with the user's supplied values, never guessed values. On ambiguity, show the candidates and obtain the exact ID. Present actual results and explain any gaps.

Read docs/replace-openbom.md. Always preview with --dry-run first. Show counts and conflicts. Save only within the user's authorised migration. Imported revisions stay draft and attachments remain separate.
