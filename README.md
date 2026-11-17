# Deal Closing for Claude Code

See what stops a corporate transaction from closing, which signatures belong to the wrong document version, and who owns the work after completion. Your closing records live in a database you own.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free under MIT. Install the base and review the demo. | Your fields, conditions, Legatics exports, signing connections and paperwork. One setup fee, then a retainer. | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |

[Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=legatics) · [Instead of Legatics](https://enterprisedna.co/omni/instead-of/legatics)

## Start with real output

Node 20 or later:

```bash
npm install
npm run demo
npm run closing -- weekly-review
npm run docs
npm run view
```

Open the folder in Claude Code, Codex, OpenCode or Cursor. AGENTS.md and CLAUDE.md route each to the same commands. Local PGlite needs no database server. DATABASE_URL selects PostgreSQL; DATA_DIR changes the embedded location. Use a trusted operator role and configure matter access before shared use. Never seed a shared production database.

The fictional demo includes an overdue board authority, a revised agreement whose old signature no longer counts, a missing owner and an overdue post-closing obligation. Relative dates keep the review useful. Seeding again preserves existing rows.

## The weekly jobs

Monday: /weekly-review combines readiness, attention and signatures due. Before signing: /stale-evidence and /dependency-blockers. During the transaction: /add, /version, /require-signature and /record-signature. The responsible lawyer supplies evidence for /complete and /close-deal. Afterwards: /post-closing and /compliance. /draft-chaser and /draft-closing prepare working drafts and never send.

30 CLI commands and 34 slash-command recipes. Every CLI command accepts --json. Exact codes, partial IDs and case-insensitive names work. Ambiguous matches list candidates and exit with failure. Writes require --actor. Run help for the supported commands.

## Closing evidence that remains current

A document version stores a hash of the supplied local file and its controlled-storage reference. Signature records point to that exact version. A new version makes older signatures stale. A changed checklist item increments revision, clears its current completion and reopens downstream items. Dependencies cannot form cycles or cross deals. Completing an item requires an owner, deadline, supporting conditions and any required current signatures. Closing requires at least one closing item and no blockers. Post-closing obligations stay open independently.

The free base records human-reviewed evidence. It does not provide electronic signing, decide legal validity, move funds or file documents. The original document bytes stay in your controlled storage. Actor names are supplied by operators and administrators can alter the database, so this is not a tamper-proof audit service. [Rule scope and sources](docs/compliance.md).

## Ten questions this build answers

These are tested checks in your version, not a claim that Legatics cannot answer them. Legatics also offers API and MCP access.

1. Which transactions cannot close because a condition is still open? Run closing-readiness.
2. Which signatures belong to an earlier document version? Run stale-evidence.
3. Who still needs to sign the current agreement? Run signatures-due.
4. Which completed deliverables reopened after a supporting condition changed? Run checklist.
5. Which late obligations remain after closing? Run post-closing.
6. Who holds the most overdue work? Run owner-load.
7. Which conditions are blocking other deliverables? Run dependency-blockers.
8. Which matters have overdue access or retention reviews? Run compliance.
9. Which source rows arrived marked complete but still need local review? Run show.
10. Who changed an item, and what did it say before? Run activity.

## Bring your history

Export a Legatics list to Excel. Create a destination deal, then import the list in one command, testing it first:

```bash
npm run closing -- import legatics --deal=DEMO-01 --list=CP --file=imports/checklist.xlsx --actor="Your name" --dry-run
npm run closing -- import legatics --deal=DEMO-01 --list=CP --file=imports/checklist.xlsx --actor="Your name"
```

XLSX is supported directly; UTF-8 CSV saved from the Excel export works too. Configurable column names use --map. Source references must remain stable between exports. All original fields stay with each imported row. Repeated rows are unchanged; changed rows need explicit --update and fresh review. Exported completion labels never certify local completion. Every batch is atomic, including a dry run. [Mapping, reconciliation and separate file migration](docs/replace-legatics.md).

## Paperwork and views

Change brand.json once. npm run docs produces a closing checklist, signature evidence matrix and closing book index per transaction. The index lists references and hashes, not a merged PDF bundle. npm run view produces the closing week, signature evidence and post-completion snapshots. Private outputs are ignored by Git. [What an application screen adds](docs/why-no-front-end.md).

## Your first hour: ten things to ask for

1. Put our firm name on the closing checklist.
2. Test-import one Legatics list.
3. Map our responsibility column.
4. Show all conditions due before Friday.
5. Add our filing reference field.
6. Record which conditions depend on board approval.
7. Identify signatures on an older agreement.
8. Group overdue work by responsible lawyer.
9. Draft the closing status report.
10. Add our retention review policy.

/customise creates and applies a migration, updates commands and tests, and shows the effect. /new-view adds a read-only report. There is no application front end.

## Verification

npm test uses an isolated temporary database, migrates and seeds twice, exercises all CLI commands and checks completion gates, dependency cycles, stale signatures, import rollback, XLSX, CSV, field mapping, exports, drafts and escaped HTML. CI covers Node 20/22 on Windows and Linux, plus PostgreSQL 17. See actual CI results before claiming a platform passed. TEST_DATABASE_URL must be an empty disposable database.

## Price evidence and ownership

Legatics quotes privately. A European organisation publicly disclosed GBP 12,500 annual expenditure in its procurement plan; that is not a vendor price or an NZ/AU customer bill. [Research and candidate scores](docs/research.md). The comparison page publishes no numerical price.

Enterprise DNA brings across agreed records, checks the result, adds your rules and documents, and scopes signing integrations, a web front end or a different stack where needed. Omni by Enterprise DNA runs the version for your firm, for one setup fee and then a retainer. [Book 30 minutes with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=legatics).

MIT. Not affiliated with Legatics or Anthropic. Hosting and coding-agent usage have their own costs.
