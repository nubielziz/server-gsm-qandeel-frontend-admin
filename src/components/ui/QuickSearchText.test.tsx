// Tests for QuickSearchText: the text is applied by the Search button and by Enter, and Enter never submits the form around the box.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { QuickSearchText } from './QuickSearchText';

function Box({ onSearch, onSubmit }: { onSearch: (text: string) => void; onSubmit: () => void }) {
  const [text, setText] = useState('');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <QuickSearchText
        value={text}
        onChange={setText}
        onSearch={() => onSearch(text)}
        placeholder="Search service"
      />
    </form>
  );
}

describe('QuickSearchText', () => {
  it('applies the text with the Search button', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<Box onSearch={onSearch} onSubmit={vi.fn()} />);
    await user.type(screen.getByRole('searchbox', { name: 'Search service' }), 'unlock');
    expect(onSearch).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(onSearch).toHaveBeenCalledWith('unlock');
  });

  it('applies the text with Enter and does not submit the form around it', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    const onSubmit = vi.fn();
    render(<Box onSearch={onSearch} onSubmit={onSubmit} />);
    await user.type(screen.getByRole('searchbox', { name: 'Search service' }), 'imei{Enter}');
    expect(onSearch).toHaveBeenCalledWith('imei');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
