// Writes docs/slices/<feature>.json: one feature's part of the route manifest, so an agent building that feature reads
// only its own endpoints. Source: docs/route-manifest.json and docs/feature-plan.json. Usage: npm run routes:slices
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/route-manifest.json'), 'utf8'));
const plan = JSON.parse(fs.readFileSync(path.join(root, 'docs/feature-plan.json'), 'utf8'));
const features = plan.features ?? plan;

// Plan rows are the manifest's origin rows: `CRUD /admin/x` (one endpoint per CRUD op) or `METHOD /path`.
const byRow = new Map();
for (const endpoint of manifest.endpoints) {
  const row = `${endpoint.origin.method} ${endpoint.origin.path}`;
  byRow.set(row, [...(byRow.get(row) ?? []), endpoint]);
}

const outDir = path.join(root, 'docs/slices');
fs.mkdirSync(outDir, { recursive: true });
let total = 0;
for (const feature of features) {
  const endpoints = feature.rows.flatMap((row) => {
    const found = byRow.get(row);
    if (!found) throw new Error(`${feature.id}: ${row} is not in the route manifest`);
    // The Arabic original and the raw auth text stay in the full manifest; agents work from the English fields.
    return found.map((endpoint) => {
      const rest = { ...endpoint };
      delete rest.descriptionAr;
      delete rest.authRaw;
      return rest;
    });
  });
  total += endpoints.length;
  const slice = {
    feature: feature.id,
    page: feature.page ?? null,
    demo: feature.demo ?? [],
    folders: feature.folders ?? [],
    notes: feature.notes ?? '',
    rules: manifest.rules,
    endpoints,
  };
  fs.writeFileSync(path.join(outDir, `${feature.id}.json`), `${JSON.stringify(slice, null, 2)}\n`);
}
console.log(`${features.length} slices, ${total} endpoints (manifest has ${manifest.endpoints.length})`);
