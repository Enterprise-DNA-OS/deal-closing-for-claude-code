# record-signature

Only record a signature after a human identifies the signer, the current document version, signed date and evidence. This is an attestation of reviewed evidence, not an electronic signing service.

Example syntax (replace demonstration values):

```bash
npm run closing -- record-signature --deal=NEW-01 --ref=DOC-01 --signer="Purchaser director" --signed-on=2026-11-17 --evidence="Signed page reference" --actor="Operator" --json
```

Report the actual result. Resolve ambiguous references before writing. Actor names and evidence must come from the operator. Draft commands write to drafts/ and never send. Never delete, publish, submit filings or move client money.
