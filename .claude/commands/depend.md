# depend

Dependencies stay inside one deal, cannot form cycles and cannot make a closing condition depend on a post-closing obligation.

Example syntax (replace demonstration values):

```bash
npm run closing -- depend --deal=NEW-01 --ref=DOC-01 --requires=CP-01 --actor="Operator" --json
```

Report the actual result. Resolve ambiguous references before writing. Actor names and evidence must come from the operator. Draft commands write to drafts/ and never send. Never delete, publish, submit filings or move client money.
