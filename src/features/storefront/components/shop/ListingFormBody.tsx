// ListingFormBody: the fields of the shop page (listing) form: the picture, the texts, the facts about the service and the search
// texts. Shared by the Edit listing dialog and the Catalog panel's shop page section; each makes its own form and its own save.
import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { ListingFormValues } from '../../lib/listingForm';
import type { ServiceListingDetail } from '../../types';
import { ListingContentFields } from '../ListingContentFields';
import { ListingFactsFields } from '../ListingFactsFields';
import { ListingImageField } from '../ListingImageField';
import { ListingSeoFields } from '../ListingSeoFields';

export interface ListingFormBodyProps {
  form: UseFormReturn<ListingFormValues>;
  /** The listing the form was read from. */
  listing: ServiceListingDetail;
  /**
   * Why the fields cannot be changed (a missing permission); the fields are then switched off, with the reason as their title. The
   * picture saves at once on its own requests, so it is switched off with the rest. The server decides in any case.
   */
  disabledReason?: string;
}

/** The four groups of fields. The picture saves at once (its own requests); the rest is the form's Save. */
export function ListingFormBody({ form, listing, disabledReason }: ListingFormBodyProps) {
  const [imageUrl, setImageUrl] = useState(listing.imageUrl);
  const {
    register,
    control,
    formState: { errors },
  } = form;
  return (
    <fieldset disabled={disabledReason !== undefined} title={disabledReason} className="min-w-0 space-y-4">
      <ListingImageField listing={listing} imageUrl={imageUrl} onChange={setImageUrl} />
      <ListingContentFields register={register} errors={errors} />
      <ListingFactsFields
        register={register}
        errors={errors}
        control={control}
        savedCountry={listing.country}
      />
      <ListingSeoFields register={register} errors={errors} />
    </fieldset>
  );
}
