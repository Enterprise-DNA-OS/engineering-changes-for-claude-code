# Bring OpenBOM records across

Source checked 12 October 2026: [OpenBOM Data Export](https://help.openbom.com/data-export/). Open a BOM, use its export control, select the properties and choose CSV. Use one single-level BOM per file. Keep your original exports and attachments separately.

## One command

```bash
npm run engineering -- import openbom --file=imports/pump.csv --assembly=PUMP-100 --code=B --actor="Migration operator" --dry-run
```

Start in a fresh migrated database. This creates the named assembly and revision if absent. Remove --dry-run after checking the planned counts. The whole batch commits or rolls back. Repeat imports of identical lines skip. Conflicting descriptions or quantities stop for explicit reconciliation. Rows missing from a later export remain present: import is additive, not a synchronised replacement.

## Mapping

| CSV heading | Destination | Rule |
| --- | --- | --- |
| Part Number | Component part number | Required, case-insensitive unique within file |
| Description or Name | Component description | Required |
| Revision | Component revision code | Defaults to imported if blank; it remains draft |
| Quantity | Quantity per parent | Positive decimal, at most four decimal places |
| Unit or Unit of Measure | Unit label | Defaults to each; no conversion |

OpenBOM properties are configurable. This fixture illustrates accepted fields, not a claimed universal OpenBOM export. Select the quantity property for the BOM. A catalog alone lacks quantities and is not the supported import.

If headings differ, write a mapping object such as {"number":"SKU","name":"Label","quantity":"Qty"} and add --mapping=imports/columns.json. Allowed keys are number, name, code, quantity and unit. Explicit mappings never fall back silently to another column.

Multi-level indented exports must be split into individual assemblies. Import nested assemblies under the matching part number and revision, then link those revisions. The importer refuses duplicate part numbers and cycles rather than guessing a hierarchy. Confirm units, counts and where-used results against the original before switching.

## What needs separate migration

CAD binaries, attachments, thumbnails, custom properties, suppliers, inventories, purchase orders, historical approvals and access permissions do not transfer in this BOM import. Retain them in the source archive and agree mappings with Enterprise DNA when they are part of your version. Source revision text is not release approval. Review the imported draft components, record evidence, then approve and release bottom-up.

A sample can be imported in a day; reconciling a whole product history depends on its exports and evidence. Hosting, identity and backup setup are separate from the data import.
