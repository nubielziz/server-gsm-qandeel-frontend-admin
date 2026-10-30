// GenerateDialog: "Generate drafts…" (`POST /admin/content-pages/generate`), the landing-page generator the map adds to the
// Landing pages tab: brand by model by network, drafts only. The same dialog then lists the drafts the server created, so the
// admin can go and review them. Nothing is published.
import { useState } from 'react';
import { FormDialog, TextareaField } from '@/components/ui';
import { useGeneratePages } from '../hooks/usePageMutations';
import { namesOf } from '../lib/names';
import type { GeneratePagesResult } from '../types';
import { GeneratedDrafts } from './GeneratedDrafts';

/** The form; after a successful run it shows the drafts the server made. */
export function GenerateDialog({ onClose }: { onClose: () => void }) {
  const generate = useGeneratePages();
  const [result, setResult] = useState<GeneratePagesResult | null>(null);
  const [brands, setBrands] = useState('');
  const [models, setModels] = useState('');
  const [networks, setNetworks] = useState('');

  if (result) return <GeneratedDrafts result={result} onClose={onClose} />;
  return (
    <FormDialog
      open
      title="Generate drafts"
      sub="One draft for each brand, model and network. They are saved for review; nothing is published."
      confirm="Generate drafts"
      onClose={onClose}
      onSubmit={async () => {
        const made = await generate.mutateAsync({
          brands: namesOf(brands),
          models: namesOf(models),
          networks: namesOf(networks),
        });
        setResult(made);
        // The form is replaced by the result, so the dialog must not close itself.
        return false;
      }}
    >
      <div className="space-y-3">
        <TextareaField
          label="Brands"
          rows={2}
          value={brands}
          onChange={(event) => setBrands(event.target.value)}
          hint="Separate with commas or new lines. Leave empty for every brand in the TAC catalogue."
          autoFocus
        />
        <TextareaField
          label="Models"
          rows={2}
          value={models}
          onChange={(event) => setModels(event.target.value)}
          hint="Leave empty for every model of those brands."
        />
        <TextareaField
          label="Networks"
          rows={2}
          value={networks}
          onChange={(event) => setNetworks(event.target.value)}
          hint="Carriers, such as AT&T or Vodafone. Leave empty for every network on the site."
        />
      </div>
    </FormDialog>
  );
}
