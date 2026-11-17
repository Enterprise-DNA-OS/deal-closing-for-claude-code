# Replace the checklist workflow in Legatics

## Export with your existing permissions

Legatics documents list export to Excel, Word and PDF. In the list select Export, then List, include all rows and required columns, choose Excel and download. A filtered export contains only the chosen rows: compare the export to the source before importing. Export document files separately as ZIP, including all versions where required. There is no single export-all operation.

Sources checked 17 November 2026: [list exports](https://knowledge.legatics.com/en/articles/5871134-exporting-data-from-lists), [all export types](https://knowledge.legatics.com/en/articles/12821804-exporting-your-data-from-legatics), [numbering](https://knowledge.legatics.com/en/articles/16310992-numbering-in-lists), [configurable columns](https://knowledge.legatics.com/en/articles/5543728-managing-columns).

## Import one list in one command

Create the destination deal with add-deal. Put the export in the ignored imports/ folder. Then:

```bash
npm run closing -- import legatics --deal=YOUR-DEAL --list=CP --file=imports/checklist.xlsx --actor="Your name" --dry-run
npm run closing -- import legatics --deal=YOUR-DEAL --list=CP --file=imports/checklist.xlsx --actor="Your name"
```

The same command accepts a UTF-8 CSV saved from that Excel export. Legatics list exports are Excel, not a claimed native list CSV. The included CSV is a synthetic fixture using documented configurable column types, not a customer export. XLSX is read directly. Use --sheet="Sheet name" when there is more than one sheet and --header-row=3 when the export includes a cover title.

Default mapping: No. (also Number, ID or Reference) becomes the source reference; Title (also Item, Document or Description) becomes title; Responsibility (also Owner or Responsible) becomes owner; Due date (or Deadline) becomes a calendar date. Due dates must be YYYY-MM-DD or actual spreadsheet date cells. Every original column, including Status and Notes, is preserved in source_data. Optional Kind accepts condition, document or postclosing; otherwise rows start as conditions. Custom names use --map=fixtures/column-map.json after editing a private copy.

## Reconcile before relying on it

The importer preserves every nonblank row, including exported headings when they have a number and title. It does not infer legal obligations from formatting. Export only operative rows, or review headings separately before import. Missing references, duplicate references, invalid dates and formula cells reject the entire batch. Dry run rolls back all rows and audit entries. Missing owners and dates remain visible and block completion.

Source identity is deal plus list plus No. Freeze the numbering before repeat imports. Renumbered lists require a reviewed mapping: otherwise a new number is a new item. Repeating identical rows changes nothing; changed rows require --update, increment revision and reopen affected downstream work. Original completion labels never become local completion without reviewed evidence.

Compare source and destination row counts, titles, owners and deadlines. Add document items for the documents you need to track. Attach versions using version with a local file and a durable storage reference; it hashes the local bytes but does not copy the file. Add required signers and record human-checked signature evidence for the current version. Model dependencies explicitly and review the closing-readiness report.

## What requires separate migration work

Files in ZIP archives, signature pages, prior approvals, comments outside exported cells, permissions, notification settings, nested formatting, binder assembly, DMS links and DocuSign connections are not imported as operating features. The free version produces an index, not a merged closing book. Preserve original documents separately. Enterprise DNA scopes these connections and workflows as part of your custom version. Retain access to Legatics until the responsible lawyer has reconciled the migration and approved the working process.

## Export again

npm run closing -- export writes every domain record, original source field, document hash, signature record, dependency and activity entry to a private JSON snapshot. Keep original document binaries alongside that export. Test backup restoration using your database tools before changing systems.
