# import

Read docs/replace-legatics.md. Export all relevant rows and freeze numbering. Run a dry run first, compare counts and mapping, then run without --dry-run. Changed source rows require reviewed --update. Original statuses remain source evidence and never authorise completion.

Example syntax (replace demonstration values):

```bash
npm run closing -- import legatics --deal=NEW-01 --list=CP --file=imports/checklist.xlsx --actor="Operator" --dry-run --json
```

Report the actual result. Resolve ambiguous references before writing. Actor names and evidence must come from the operator. Draft commands write to drafts/ and never send. Never delete, publish, submit filings or move client money.
