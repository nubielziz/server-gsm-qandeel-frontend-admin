// What the pinned-results form sends: the body of a new rule, and for an edit only the fields that changed. Pure, so the dialog
// stays about the form and the comparison (the saved times hold seconds, the boxes do not) has a test.
import type {
  CreatePinBody,
  HiddenService,
  PinMatch,
  PinnedService,
  SearchPin,
  UpdatePinBody,
} from '../types';
import { fromInputValue, normaliseTerm, toInputValue } from './search';

/** The form's values: `startsAt` and `endsAt` are the text of `datetime-local` boxes (empty for none). */
export type PinFormValues = {
  query: string;
  match: PinMatch;
  pinned: PinnedService[];
  hidden: HiddenService[];
  startsAt: string;
  endsAt: string;
  note: string;
  isEnabled: boolean;
};

/**
 * The pinned services as the server takes them: in the order of the form, without titles. The order matters: the server names a
 * refusal by its place in the body (`pinned.<i>.serviceId`) and the dialog shows it on form row i, so the two must match.
 */
const asSent = (pinned: readonly PinnedService[]) =>
  pinned.map(({ serviceId, position }) => ({ serviceId, position }));

/** The same list by position, only to tell whether two lists pin the same services in the same places. */
const byPosition = (pinned: readonly PinnedService[]) =>
  [...asSent(pinned)].sort((a, b) => a.position - b.position);

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The body of `POST /admin/search/pins`; a date or a note left empty is not sent. */
export function createPinBody(values: PinFormValues): CreatePinBody {
  const startsAt = fromInputValue(values.startsAt);
  const endsAt = fromInputValue(values.endsAt);
  const note = values.note.trim();
  return {
    query: normaliseTerm(values.query),
    match: values.match,
    pinned: asSent(values.pinned),
    hidden: values.hidden.map((item) => item.serviceId),
    isEnabled: values.isEnabled,
    ...(startsAt ? { startsAt } : {}),
    ...(endsAt ? { endsAt } : {}),
    ...(note ? { note } : {}),
  };
}

/**
 * The body of `PATCH /admin/search/pins/:id`: only what differs from the saved rule. Times are compared as the boxes show them
 * (to the minute), so a saved time with seconds is not sent back as a change; clearing a box sends `null`.
 */
export function changedPinFields(values: PinFormValues, pin: SearchPin): UpdatePinBody {
  const body: UpdatePinBody = {};
  const query = normaliseTerm(values.query);
  if (query !== pin.query) body.query = query;
  if (values.match !== pin.match) body.match = values.match;
  if (!same(byPosition(values.pinned), byPosition(pin.pinned))) body.pinned = asSent(values.pinned);
  const hidden = values.hidden.map((item) => item.serviceId);
  if (
    !same(
      hidden,
      pin.hidden.map((item) => item.serviceId),
    )
  )
    body.hidden = hidden;
  if (values.startsAt !== toInputValue(pin.startsAt)) body.startsAt = fromInputValue(values.startsAt);
  if (values.endsAt !== toInputValue(pin.endsAt)) body.endsAt = fromInputValue(values.endsAt);
  const note = values.note.trim();
  if (note !== pin.note) body.note = note;
  if (values.isEnabled !== pin.isEnabled) body.isEnabled = values.isEnabled;
  return body;
}
