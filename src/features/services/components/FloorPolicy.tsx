// FloorPolicy: the "Floor policy" note at the foot of the Rules and groups tab. The words are the demo's (rulesTab in
// 43-p-services.js); the server enforces the floor, and the 6% default is the demo's figure (a backend question in HANDOFF).
export function FloorPolicy() {
  return (
    <div className="p-3.5 text-sm text-ink2">
      <h2 className="panel-t mb-1">Floor policy</h2>
      <p>
        No price can go below <strong className="font-medium">supplier cost plus minimum profit</strong>.
        Minimum profit defaults to 6% of cost, at least $0.02. When a supplier raises a cost, orders are
        charged the new floor until you update the price.
      </p>
    </div>
  );
}
