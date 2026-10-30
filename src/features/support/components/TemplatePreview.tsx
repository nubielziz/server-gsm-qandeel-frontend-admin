// TemplatePreview: under the template form: the text as a customer would get it, with sample values in place of the variables, the
// list of variables a template may use, and a warning for any other `{{variable}}` (it would be sent as written). New in the
// console: the demo had no way to edit its templates.
import { fillTemplate, SAMPLE_VALUES, TEMPLATE_VARIABLES, unknownVariables } from '../lib/macros';

export function TemplatePreview({ body }: { body: string }) {
  const unknown = unknownVariables(body);
  return (
    <div className="rounded-md border border-line bg-sunken p-3 text-sm">
      <p className="text-xs font-medium text-ink3">Preview with sample values</p>
      <p className="mt-1 min-h-5 whitespace-pre-wrap" data-testid="template-preview">
        {body.trim() ? (
          fillTemplate(body, SAMPLE_VALUES)
        ) : (
          <span className="text-ink3">Nothing to preview yet.</span>
        )}
      </p>
      <ul className="mt-2 space-y-0.5 text-xs text-ink3" aria-label="Variables">
        {TEMPLATE_VARIABLES.map((variable) => (
          <li key={variable.name}>
            <code className="mono text-ink2">{`{{${variable.name}}}`}</code> is {variable.meaning} (
            <span className="mono">{SAMPLE_VALUES[variable.name]}</span> here).
          </li>
        ))}
      </ul>
      {unknown.length > 0 && (
        <p role="status" className="mt-2 text-xs font-medium text-warn-fg">
          {unknown.map((name) => `{{${name}}}`).join(', ')} {unknown.length === 1 ? 'is' : 'are'} not a known
          variable and will be sent as written.
        </p>
      )}
    </div>
  );
}
