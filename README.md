# Engineering Changes for Claude Code

Keep the released revision, the component list and the engineering approval together. Own the records behind your design handover.

## Three ways to run it

- **Do it yourself.** Use the free MIT-licensed base with Claude Code, Codex, OpenCode or Cursor. You arrange database hosting, access controls and agent usage.
- **We customise it.** Enterprise DNA brings your OpenBOM records across and adds your review rules, fields, integrations or screens. One setup fee, then an agreed retainer for ongoing work.
- **We run it for you.** Omni by Enterprise DNA installs, connects, backs up and operates your version. One setup fee, then a monthly retainer. [Book a call](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=openbom&utm_medium=readme).

## Start with fictional records

```bash
npm install
npm run demo
npm run engineering -- change-board
npm run engineering -- obsolete-parts
npm run engineering -- compliance --json
npm run view
npm run docs
npm test
```

Node 20 or newer. PGlite stores local records in .data/db when DATABASE_URL is unset. Set DATABASE_URL to use PostgreSQL. Both use the same migrations. Run one local writer at a time. Tests use disposable data and ignore your normal DATABASE_URL. TEST_DATABASE_URL must point to an empty disposable PostgreSQL database.

Harbour Engineering, its people and every demo:// reference are fictional. Seed dates are relative to the day you run the demo. Never use the demo database for production records.

## The engineering week

Review the change board, chase late decisions, inspect release gaps, assess component impact and prepare design handovers. Revisions have draft, released and obsolete states. A change needs a different named reviewer from its author. Approval freezes the draft. Release checks the evidence and component states again. Released revisions remain unchanged. New work starts a new revision and adds its component lines explicitly.

The database holds parts, revisions, component quantities, engineering changes and an activity history. It records evidence references rather than storing CAD binaries. Component cycles are refused. Recursive bill-of-materials and where-used queries trace nested assemblies. Quantity multiplication assumes component quantities are expressed per one parent assembly, with no unit conversion.

## Ten questions answered from your records

These run today. OpenBOM has reporting and integrations too; this list does not claim it cannot produce equivalent answers.

- Which engineering changes have missed their agreed date? `overdue-changes`
- Which approved designs are ready for release? `release-review`
- Which assemblies still specify an obsolete component? `obsolete-parts`
- Which draft designs have been untouched for a month? `stale`
- Which owners have the most overdue changes? `owner-load`
- Which components are shared across assemblies? `shared-components`
- Which revisions lack test evidence or safe-use information? `missing-evidence`
- Which assemblies depend on a particular component revision? `where-used --revision="SEAL-10 / A"`
- What quantities are required through a nested assembly? `bom --revision="PUMP-100 / B"`
- Who recorded the last approval or design change? `history`

## Bring an OpenBOM bill of materials across

```bash
npm run engineering -- import openbom --file=examples/openbom.csv --assembly=DEMO-IMPORT --code=A --actor="Migration operator" --dry-run
```

Remove --dry-run after reviewing the result. One command imports one single-level BOM into a named assembly revision. Repeat for additional assemblies, then link their revisions. Custom headings use an explicit mapping file. Imports create draft revisions, never historical approvals. Identical lines skip; conflicting descriptions or quantities stop the entire batch. New input adds lines and never silently deletes absent ones. [Switch guide](docs/replace-openbom.md).

## Record and release a revision

```bash
npm run engineering -- add-part --number=FIXTURE-1 --name="Holding fixture" --owner=Moana --actor=Moana
npm run engineering -- add-revision --part=FIXTURE-1 --code=A --actor=Moana
npm run engineering -- evidence --revision="FIXTURE-1 / A" --purpose="Hold pump during assembly" --test="private://test-reference" --instructions="Clamp before use" --actor=Moana
npm run engineering -- raise-change --revision="FIXTURE-1 / A" --name="Fixture first release" --reason="Initial design" --due=2026-12-01 --actor=Moana
npm run engineering -- approve --change="Fixture first release" --actor=Aroha
npm run engineering -- release --change="Fixture first release" --note="Reviewed for controlled handover" --actor=Moana
```

Use your actual evidence and agreed dates. --actor records operator attribution, not authenticated identity. A hosted installation needs reviewed roles and access controls. Database owners can change records directly; the activity history is not tamper-proof. Public database access is revoked and row security is enabled on the domain records. The owner connection runs the CLI.

## Commands

Run npm run engineering -- help for exact flags. Every command supports --json. Read commands default to aligned text. Names match without case, or use a full ID. Ambiguous selections list matches and exit 1. All record changes require --actor.

- /help
- /parts
- /revisions
- /change-board
- /release-review
- /overdue-changes
- /obsolete-parts
- /unreleased-components
- /missing-evidence
- /owner-load
- /shared-components
- /stale
- /attention
- /compliance
- /history
- /bom: --revision="PUMP-100 / B"
- /where-used: --revision="SEAL-10 / A"
- /handover: --revision="PUMP-100 / B"
- /search: --text=<words>
- /add-part: --number=<part-number> --name=<description> --owner=<owner> --actor=<operator>
- /add-revision: --part=<part-number-or-id> --code=<revision> --actor=<operator>
- /add-line: --revision=<parent-revision> --component=<child-revision> --quantity=<positive-number> --unit=<unit> --actor=<operator>
- /remove-line: --revision=<draft-revision> --component=<child-revision> --actor=<operator>
- /evidence: --revision=<draft-revision> --purpose=<intended-use> --test=<evidence-reference> --instructions=<safe-use-information> --actor=<operator>
- /raise-change: --revision=<draft-revision> --name=<change-title> --reason=<why> --due=<YYYY-MM-DD> --actor=<author>
- /approve: --change=<change-name-or-id> --actor=<independent-reviewer>
- /release: --change=<change-name-or-id> --note=<release-note> --actor=<operator>
- /obsolete: --revision=<released-revision> --note=<reason> --actor=<operator>
- /log: --revision=<revision> --note=<record> --actor=<operator>
- /import: openbom --file=<csv-path> --assembly=<assembly-number> --code=<revision> --actor=<operator> --dry-run
- /export: --out=exports/<unique-name>.json
- /weekly-review
- /draft-handover: --revision=<revision>

## Documents and views

npm run docs creates engineering change notices and design handover drafts, one HTML document per record. npm run view produces the engineering week and released design register. Set your business name, logo and colours in brand.json. Documents include recorded approval status and unresolved gaps. Review them before sharing. No command sends anything.

The compliance command checks that intended use, test evidence and safe-use information are recorded, and that components are released. These are scoped documentation prompts for NZ plant design, not an engineering assessment, certification or a complete legal compliance check. [Rules and sources](docs/compliance.md). Australian and sector-specific obligations need their own reviewed rules.

## Your first hour: ten things to ask for

1. Put our business name and logo on the design handover.
2. Show the overdue changes by owner.
3. Explain which obsolete components remain in draft assemblies.
4. Show the parents of a seal revision.
5. Draft the weekly engineering review.
6. Import a sample BOM without saving it.
7. Add our drawing-number field through a migration.
8. Create a read-only view for the workshop supervisor.
9. Record a real test evidence reference for a draft design.
10. Add our release review checklist and test its refusal cases.

/customise writes the next migration, tests it on disposable data and applies it within your authorised request. /new-view adds a read-only query. [Why no front end](docs/why-no-front-end.md).

## Backup and verification

npm run engineering -- export --out=exports/backup.json writes the full domain records and activity history without overwriting an existing file. Keep this private. Recovery is a reviewed restore into an empty database, not the OpenBOM CSV importer.

npm test checks every CLI command, idempotent migration and seed, independent approval, frozen and released revisions, component cycles, recursive quantities, import rollback and repeats, ambiguous names, private drafts, exported data and escaped HTML. CI repeats tests on Windows and Linux and a separate PostgreSQL service. Local success does not assert remote CI success.

MIT licence. Independent of OpenBOM and its owner. Product names belong to their owners. [Research and scoring](docs/research.md).
