// ListingImageField: the picture of the service in the listing editor: a preview, a file input, Upload and Remove. It saves at
// once (its own requests, not the form's Save). The picture belongs to the service, so it shows in every language. A client check
// stops a wrong type or a file over 2 MiB; the server's refusal (too small, animated, corrupt…) shows under the control.
import { useRef, useState } from 'react';
import { Button, errorText, Icon } from '@/components/ui';
import { isApiError } from '@/lib/api';
import { useRemoveListingImage, useUploadListingImage } from '../hooks/useListingMutations';
import { IMAGE_TYPES, imageProblem, imageSrc } from '../lib/listingForm';
import type { ServiceListing } from '../types';

export interface ListingImageFieldProps {
  listing: ServiceListing;
  /** The picture now: the listing's own at first, then what each upload or removal answered. */
  imageUrl: string | null;
  onChange: (imageUrl: string | null) => void;
}

/** The server's words for a refused picture: the message under `file`, else the problem's detail. */
function refusal(error: unknown): string {
  if (isApiError(error)) return error.fieldErrors.file?.join(' ') || errorText(error);
  return errorText(error);
}

/** Preview and controls for the picture. */
export function ListingImageField({ listing, imageUrl, onChange }: ListingImageFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const upload = useUploadListingImage();
  const remove = useRemoveListingImage();
  const busy = upload.isPending || remove.isPending;

  const choose = async (file: File | undefined) => {
    if (!file) return;
    const stop = imageProblem(file);
    setProblem(stop);
    if (stop) return;
    try {
      onChange((await upload.mutateAsync({ listing, file })).imageUrl);
    } catch (error) {
      setProblem(refusal(error));
    } finally {
      if (input.current) input.current.value = '';
    }
  };

  const clear = async () => {
    setProblem(null);
    try {
      await remove.mutateAsync(listing);
      onChange(null);
    } catch (error) {
      setProblem(refusal(error));
    }
  };

  return (
    <div className="flex items-start gap-3">
      <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-sunken text-ink3">
        {imageUrl ? (
          <img
            src={imageSrc(imageUrl)}
            alt={`Picture of ${listing.service.name}`}
            className="size-full object-cover"
          />
        ) : (
          <Icon name="file" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="label">Picture</p>
        <input
          ref={input}
          type="file"
          className="sr-only"
          accept={IMAGE_TYPES.join(',')}
          aria-label="Picture file"
          tabIndex={-1}
          disabled={busy}
          onChange={(event) => void choose(event.target.files?.[0])}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            loading={upload.isPending}
            disabled={remove.isPending}
            onClick={() => input.current?.click()}
          >
            <Icon name="upload" className="ic-xs" />
            {imageUrl ? 'Replace picture…' : 'Upload picture…'}
          </Button>
          {imageUrl && (
            <Button
              size="sm"
              loading={remove.isPending}
              disabled={upload.isPending}
              onClick={() => void clear()}
            >
              Remove picture
            </Button>
          )}
        </div>
        <p className="hint">
          JPEG, PNG or WebP, up to 2 MiB, at least 200 pixels on each side. It shows in every language of this
          service and is saved as soon as you choose it.
        </p>
        {problem && (
          <p className="mt-1 text-xs text-crit-fg" role="alert">
            {problem}
          </p>
        )}
      </div>
    </div>
  );
}
