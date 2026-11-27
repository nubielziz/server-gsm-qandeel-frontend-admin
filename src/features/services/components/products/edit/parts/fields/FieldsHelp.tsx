// FieldsHelp: the one sentence under the Custom Fields heading and the quiet "How this works" disclosure that holds the longer help (decisions
// 029, 031, 032, 034). A closed <details> keeps its list in the page, so the tick boxes of the Main input column can still point at their item.
import { FIELD_TYPE_HELP, FIELD_TYPE_OPTIONS } from '../../../../../lib/options';

export interface FieldsHelpProps {
  /** The id of the Main input item: every tick box of the Main input column points at it (aria-describedby). */
  mainInputId: string;
}

/**
 * What the buyer fills in, in one sentence, then a native disclosure (closed by default, no script) with what each column means as a short
 * list. The list says what the supplier receives (Name), what buyers read (Label), one line for each kind of field the server checks (what a
 * buyer must type), what the main input is, and that a pattern from the supplier import is kept and not shown (decision 030).
 */
export function FieldsHelp({ mainInputId }: FieldsHelpProps) {
  return (
    <div className="mb-3">
      <p className="text-sm text-ink2">What the buyer fills in when ordering, in this order.</p>
      <details className="mt-1 text-xs">
        <summary className="w-fit cursor-pointer select-none text-ink3 hover:text-ink2">
          How this works
        </summary>
        <ul className="mt-1.5 list-disc space-y-1 ps-5 text-ink2">
          <li>Name: what the supplier receives.</li>
          <li>Label: what buyers read (the name when left empty).</li>
          {FIELD_TYPE_OPTIONS.filter((option) => FIELD_TYPE_HELP[option.value]).map((option) => (
            <li key={option.value}>
              Type &quot;{option.label}&quot;: {FIELD_TYPE_HELP[option.value]}
            </li>
          ))}
          <li id={mainInputId}>
            Main input: the one field the order is about (IMEI, serial, ECID); the supplier receives it as the
            IMEI and order lists show it.
          </li>
          <li>A pattern the supplier import gave a field is kept and not shown.</li>
        </ul>
      </details>
    </div>
  );
}
