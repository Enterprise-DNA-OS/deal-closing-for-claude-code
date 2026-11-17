# close-deal

Read closing-readiness, checklist and signatures-due first. Closing requires at least one closing item and no blockers. Report any remaining post-closing obligations separately. This records the human decision, it does not execute a transaction.

Example syntax (replace demonstration values):

```bash
npm run closing -- close-deal --deal=NEW-01 --evidence="Responsible lawyer closing authority" --actor="Operator" --json
```

Report the actual result. Resolve ambiguous references before writing. Actor names and evidence must come from the operator. Draft commands write to drafts/ and never send. Never delete, publish, submit filings or move client money.
