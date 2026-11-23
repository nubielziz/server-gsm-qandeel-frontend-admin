// The contract of the Add services flow of the Catalog page: after step 1 chose a supplier and a way in, a path dialog takes
// over. Both paths (whole groups, single services) take these props, so the frame of the flow can mount either.
import type { Supplier } from '../../types';

/** The three steps the flow names in its step line. */
export const ADD_FLOW_STEPS = [
  { id: 'from', label: 'Where from' },
  { id: 'prices', label: 'Prices and category' },
  { id: 'finish', label: 'Finish' },
] as const;

/** The id of one of {@link ADD_FLOW_STEPS}. */
export type AddFlowStepId = (typeof ADD_FLOW_STEPS)[number]['id'];

/** What a path dialog of the flow receives. A path is a whole dialog: it shows steps 2 and 3 and has its own buttons. */
export type AddFlowPathProps = {
  /** The supplier chosen in step 1. */
  supplier: Supplier;
  /** Back to step 1 ("Where from"); the path unmounts. */
  onBack: () => void;
  /** Close the whole flow. */
  onClose: () => void;
  /** Called once when the run of the path ended and services were added, so the page behind can refresh. */
  onDone?: () => void;
};
