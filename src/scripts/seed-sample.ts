import { sourceItemSchema } from '../modules/source-items/source-item.schema.js';
import { insertSourceItem } from '../modules/source-items/source-item.repository.js';

const samples = [
  {
    source: 'seed',
    sourceKind: 'complaint',
    externalId: 'seed-procurement-approval-1',
    sourceUrl: 'https://example.local/seed/procurement-approval-1',
    title: 'PO approvals are tracked in spreadsheets',
    body: 'Our procurement team still uses Excel and email to chase purchase order approvals. It takes hours every week, creates delays, and approvals get missed when managers are traveling.',
    authorName: 'seed-user',
    createdAt: '2026-06-10T00:00:00.000Z',
    normalizedText: 'Our procurement team still uses Excel and email to chase purchase order approvals. It takes hours every week, creates delays, and approvals get missed when managers are traveling.',
    matchedQuery: 'procurement approval',
    sourceContext: {
      kind: 'seed'
    },
    rawPayload: {
      type: 'seed',
      vertical: 'procurement'
    }
  },
  {
    source: 'seed',
    sourceKind: 'complaint',
    externalId: 'seed-inventory-reconciliation-1',
    sourceUrl: 'https://example.local/seed/inventory-reconciliation-1',
    title: 'Warehouse inventory reconciliation is manual',
    body: 'We manually compare inventory counts between our warehouse system and accounting software every Friday. It is a spreadsheet nightmare and errors cause delayed shipments and angry customers.',
    authorName: 'seed-user',
    createdAt: '2026-06-10T00:00:00.000Z',
    normalizedText: 'We manually compare inventory counts between our warehouse system and accounting software every Friday. It is a spreadsheet nightmare and errors cause delayed shipments and angry customers.',
    matchedQuery: 'inventory reconciliation',
    sourceContext: {
      kind: 'seed'
    },
    rawPayload: {
      type: 'seed',
      vertical: 'inventory'
    }
  }
];

Promise.all(samples.map((sample) => insertSourceItem(sourceItemSchema.parse(sample))))
  .then((result) => {
    console.log(JSON.stringify({ insertedCount: result.length }, null, 2));
  })
  .catch((error: unknown) => {
    console.error('Sample seed failed', error);
    process.exitCode = 1;
  });
