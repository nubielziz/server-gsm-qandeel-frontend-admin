// EditView: the edit view of one service (`?view=edit&id=<id>&part=<part>`): the layout of a record with many parts. A narrow menu on the left
// lists the parts (lib/serviceParts), the right side shows the one the address names, and each part saves on its own. This file reads the
// address; ServiceEditor reads the service and OpenService draws it and holds the unsaved-changes question.
import { useSearchParams } from 'react-router';
import { ButtonLink, EmptyState } from '@/components/ui';
import { parsePart, parseRecordId } from '../../../lib/productsPath';
import { lastAllLink } from '../all/lastAllAddress';
import type { ProductsViewProps } from '../types';
import { ServiceEditor } from './ServiceEditor';

/** The editor of the service the address names, or a line saying none is named. */
export function EditView({ type, grants }: ProductsViewProps) {
  const [params] = useSearchParams();
  const id = parseRecordId(params.get('id'));
  if (id === null) {
    return (
      <EmptyState
        icon="tag"
        title="No service chosen"
        cta={<ButtonLink to={lastAllLink(type)}>Back to All</ButtonLink>}
      >
        Open a service from the list to edit it.
      </EmptyState>
    );
  }
  return <ServiceEditor key={id} id={id} part={parsePart(params.get('part'))} type={type} grants={grants} />;
}
