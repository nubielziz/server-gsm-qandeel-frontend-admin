// AudienceCount: section 3 of the composer, the live count. It asks `POST /admin/notification-campaigns/audience-preview` 400 ms after the last change and
// shows how many people the message reaches (large), then by kind and channel, and who is left out and why, in words. Nothing is asked until the
// audience is complete; the previous answer stays on screen (dimmed) while the next one loads. It shows the server's refusal when it gives one.
import { Icon } from '@/components/ui';
import { errorText } from '@/components/ui';
import { num } from '@/lib/format';
import { useAudiencePreview } from '../hooks/useAudiencePreview';
import { useSettledValue } from '../hooks/useSettledValue';
import { byChannelText, byTypeText, exclusionLines, plural } from '../lib/audienceText';
import { countRequest, type ComposerForm } from '../lib/spec';

export function AudienceCount({ form }: { form: ComposerForm }) {
  const settled = useSettledValue(countRequest(form));
  const preview = useAudiencePreview(settled);
  const data = preview.data;
  const waiting = JSON.stringify(settled) !== JSON.stringify(countRequest(form)) || preview.isFetching;

  return (
    <section aria-label="Reach" className="rounded-md border border-line2 bg-sunken p-4">
      <h3 className="mb-2 text-sm font-semibold">3. Reach</h3>
      {settled === null && !data ? (
        <p className="text-sm text-ink3">
          Choose who gets the message and how, to see how many people it reaches.
        </p>
      ) : preview.isError ? (
        <p className="flex items-start gap-2 text-sm text-crit-fg" role="alert">
          <Icon name="alert" className="ic-sm mt-0.5 flex-none" />
          <span>{errorText(preview.error)}</span>
        </p>
      ) : !data ? (
        <p className="text-sm text-ink3">Counting…</p>
      ) : (
        <div className={waiting ? 'opacity-60' : undefined} aria-busy={waiting || undefined}>
          <p className="text-xs text-ink3">This message reaches</p>
          <p className="text-3xl font-semibold tabular-nums tracking-tight" aria-live="polite">
            {plural(data.reachable, 'person', 'people')}
          </p>
          {data.total !== data.reachable && (
            <p className="text-xs text-ink3">
              {num(data.total)} are in the audience; the rest cannot be reached with these channels.
            </p>
          )}
          <dl className="mt-3 space-y-1 text-sm">
            {[
              ['Who', byTypeText(data.byType)],
              ['Messages', byChannelText(data.byChannel, form.channels)],
            ].map(([label, text]) =>
              text ? (
                <div key={label} className="flex gap-2">
                  <dt className="w-20 flex-none text-ink3">{label}</dt>
                  <dd>{text}</dd>
                </div>
              ) : null,
            )}
          </dl>
          {exclusionLines(data.excluded).length > 0 && (
            <ul className="mt-3 list-disc space-y-0.5 ps-5 text-sm text-ink2">
              {exclusionLines(data.excluded).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
