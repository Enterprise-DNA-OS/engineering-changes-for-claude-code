# Engineering Changes for Claude Code

Read README.md and the matching .claude/commands recipe. All runtimes use the same scripts.

- Start every answer about records with a CLI read. Never invent evidence or approval.
- Harbour Engineering demo data is fictional. Keep it separate from real records.
- Stay on main. Never change repository visibility, send messages or publish output.
- Use npm run engineering -- <command>. --json gives machine-readable output.
- Writes require --actor. This is attribution, not authentication. Do not claim a person's approval unless they actually gave it.
- Resolve ambiguous names using the printed candidate IDs. Never guess.
- Released revisions are immutable through the CLI. Create a new revision for a new design. Approved revisions are frozen. Do not bypass gates with direct updates.
- Keep CAD files, evidence and backups private. Evidence links are references, not verified proofs.
- Read docs/compliance.md before explaining any compliance flag. Engineers decide whether evidence is sufficient.
- Run imports with --dry-run first. Follow docs/replace-openbom.md and never invent a missing export column.
- Back up before migrations. Never edit an applied migration. Add the next migration, update commands and tests, then run npm test on disposable data.
- /customise changes the user's authorised fields or rules. /new-view creates a read-only report. Neither creates public or editing screens.
- Tests ignore normal DATABASE_URL. TEST_DATABASE_URL must be an empty disposable database.
- Generated handovers and weekly reviews stay private drafts. Never send them.

## Files

scripts/engineering.mjs holds the domain CLI. supabase/migrations holds the schema. scripts/lib/db.mjs selects the local or hosted database. brand.json, views.json and documents.json configure private reports. AGENTS.md points every runtime here.
