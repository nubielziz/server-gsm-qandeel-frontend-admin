// DiffTable: the Field / Before / After table of an expanded audit entry. Ports the `detail` table of pageAudit in
// 47-p-audit.js. An entry that changed no field (a sign-in) says so.
import type { DiffLine } from '../lib/diff';
import { DiffValue } from './DiffValue';

export function DiffTable({ lines, code }: { lines: readonly DiffLine[]; code: string }) {
  return (
    <table className="w-full text-xs">
      <caption className="sr-only">Changes made by {code}</caption>
      <thead>
        <tr className="text-ink3">
          <th scope="col" className="py-1 text-start font-medium">
            Field
          </th>
          <th scope="col" className="py-1 text-start font-medium">
            Before
          </th>
          <th scope="col" className="py-1 text-start font-medium">
            After
          </th>
        </tr>
      </thead>
      <tbody>
        {lines.length === 0 ? (
          <tr className="border-t border-line">
            <td className="py-1.5 text-ink3" colSpan={3}>
              No field changes recorded for this action.
            </td>
          </tr>
        ) : (
          lines.map((line) => (
            <tr key={line.field} className="border-t border-line align-top">
              <td className="mono py-1.5 pe-3">{line.field}</td>
              <td className="py-1.5 pe-3 text-ink2">
                <DiffValue value={line.from} />
              </td>
              <td className="py-1.5 font-medium">
                <DiffValue value={line.to} />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
