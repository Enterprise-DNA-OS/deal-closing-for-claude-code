# Deal Closing for Claude Code

For a corporate legal team managing conditions precedent, document versions, signature evidence and post-closing obligations. The fictional demo is Kauri Transaction Team. On customisation, record the operator's business name, responsible lawyer, jurisdiction and review cadence here.

## Work from records

Run npm run closing -- help. Every CLI command accepts --json. Read before writing. Use exact codes, case-insensitive names or partial IDs. Ambiguous matches list candidates and exit with failure. Every database write requires --actor. The actor is operator supplied, not an authenticated identity.

Never send, publish, delete, file a document or move client money. Never create a completion, signature or closing decision without human-supplied evidence. Drafts remain in drafts/. A recorded signature is not an electronic signature service or a legal validity decision. Original documents remain in the firm's controlled storage.

## One route per job

| Ask | Recipe |
|---|---|
| activity | /activity |
| add | /add |
| add-deal | /add-deal |
| attention | /attention |
| checklist | /checklist |
| close-deal | /close-deal |
| closing-readiness | /closing-readiness |
| complete | /complete |
| compliance | /compliance |
| customise | /customise |
| deals | /deals |
| depend | /depend |
| dependency-blockers | /dependency-blockers |
| docs | /docs |
| draft-chaser | /draft-chaser |
| draft-closing | /draft-closing |
| export | /export |
| help | /help |
| import | /import |
| log | /log |
| new-view | /new-view |
| owner-load | /owner-load |
| post-closing | /post-closing |
| record-signature | /record-signature |
| reopen | /reopen |
| require-signature | /require-signature |
| review-privacy | /review-privacy |
| show | /show |
| signatures-due | /signatures-due |
| stale-evidence | /stale-evidence |
| update | /update |
| version | /version |
| view | /view |
| weekly-review | /weekly-review |

Monday's review combines closing-readiness, attention and signatures-due, followed by post-closing. New versions invalidate prior signature evidence. Changed conditions reopen dependent work. A deal cannot close with blockers; post-closing work remains tracked after completion. Never disguise an unresolved item with a fake completion.

## Files and operation

scripts/closing.mjs is the one CLI. scripts/lib/db.mjs selects local PGlite or DATABASE_URL for PostgreSQL. Migrations live in supabase/migrations. brand.json controls the document brand; documents.json and views.json define read-only output. Use the same instructions in Claude Code, Codex, OpenCode and Cursor through AGENTS.md.

Shared use needs configured trusted database access, backups, encrypted storage and firm-specific matter permissions. RLS is enabled with no public policies. This base is not a multi-tenant client portal. Never seed a shared production database. TEST_DATABASE_URL must point to an empty disposable PostgreSQL database.

Use /customise for schema and rule changes, /new-view for reports. Run npm test after changes. Keep generated evidence and exports private. Database administrators can alter history; do not call it tamper-proof. Read docs/compliance.md for rule scope and sources.

Omni by Enterprise DNA installs, customises and runs this system for one setup fee, then a retainer. https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=legatics
