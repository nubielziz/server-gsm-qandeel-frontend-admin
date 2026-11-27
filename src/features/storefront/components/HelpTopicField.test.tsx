// Tests for the Topic input of the help article form: the menu of topics in use with "New topic…", a stored topic the list does not know,
// and the plain box when there is no article yet.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { HelpTopicField, type HelpFormValues } from './HelpTopicField';

const TOPICS = ['IMEI', 'Orders', 'Payments'];

/** A form that shows the topic input and the value the form holds, and a button that submits it. */
function Host({
  topics,
  loading = false,
  start = '',
}: {
  topics: string[];
  loading?: boolean;
  start?: string;
}) {
  const form = useForm<HelpFormValues>({
    defaultValues: { category: start, question: '', answerMd: '', isPublished: false },
  });
  return (
    <form onSubmit={(event) => void form.handleSubmit(() => undefined)(event)}>
      <HelpTopicField control={form.control} topics={topics} loading={loading} />
      <output aria-label="Held">{form.watch('category')}</output>
      <button type="submit">Check</button>
    </form>
  );
}

const optionTexts = () => screen.getAllByRole('option').map((option) => option.textContent);

describe('HelpTopicField', () => {
  it('offers the topics in use, then "New topic…", and holds the chosen topic text', async () => {
    const user = userEvent.setup();
    render(<Host topics={TOPICS} />);
    expect(optionTexts()).toEqual(['Choose a topic…', 'IMEI', 'Orders', 'Payments', 'New topic…']);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Topic' }), 'Orders');
    expect(screen.getByLabelText('Held')).toHaveTextContent('Orders');
  });

  it('reveals the box for a new topic, empty, and keeps what is typed as the topic', async () => {
    const user = userEvent.setup();
    render(<Host topics={TOPICS} start="Orders" />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Topic' }), 'New topic…');
    const box = screen.getByRole('textbox', { name: 'New topic' });
    expect(box).toHaveValue('');
    await user.type(box, 'Billing');
    expect(screen.getByLabelText('Held')).toHaveTextContent('Billing');
    // Choosing a topic again puts the box away.
    await user.selectOptions(screen.getByRole('combobox', { name: 'Topic' }), 'IMEI');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Held')).toHaveTextContent('IMEI');
  });

  it('keeps a stored topic the list does not know chosen and shown as it is', () => {
    render(<Host topics={TOPICS} start="Legacy topic" />);
    expect(screen.getByRole('combobox', { name: 'Topic' })).toHaveValue('Legacy topic');
    expect(optionTexts()).toContain('Legacy topic');
  });

  it('shows only the box when no article uses a topic yet', async () => {
    const user = userEvent.setup();
    render(<Host topics={[]} />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Topic' }), 'Orders');
    expect(screen.getByLabelText('Held')).toHaveTextContent('Orders');
  });

  it('waits with a disabled menu while the articles are read, so the box does not flash', () => {
    render(<Host topics={[]} loading />);
    expect(screen.getByRole('combobox', { name: 'Topic' })).toBeDisabled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('asks for a topic when none is chosen', async () => {
    const user = userEvent.setup();
    render(<Host topics={TOPICS} />);
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText('Enter a topic.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Topic' })).toHaveAttribute('aria-invalid', 'true');
  });
});
