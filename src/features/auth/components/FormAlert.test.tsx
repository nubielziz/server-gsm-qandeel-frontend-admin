// Tests for FormAlert: nothing before a failed submit, a visible box for a server failure, and a screen-reader-only
// summary of the fields that need attention.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { fieldSummary } from './fieldSummary';
import { FormAlert } from './FormAlert';

describe('fieldSummary', () => {
  it('names one field, or counts and lists several', () => {
    expect(fieldSummary(['Email'])).toBe('Email needs attention.');
    expect(fieldSummary(['Email', 'Password'])).toBe('2 fields need attention: Email, Password.');
  });
});

describe('FormAlert', () => {
  it('renders nothing while there is nothing to say', () => {
    const { container } = render(<FormAlert />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a server failure with its next step and request id', () => {
    render(<FormAlert problem={{ title: 'Server error', detail: 'Try again later.', requestId: 'req-9' }} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Server error');
    expect(alert).toHaveTextContent('Try again later.');
    expect(alert).toHaveTextContent('Request req-9');
  });

  it('lists field errors for screen readers only', () => {
    render(<FormAlert fields={['Email', 'Password']} />);
    const summary = screen.getByText('2 fields need attention: Email, Password.');
    expect(summary).toHaveClass('sr-only');
    expect(screen.getByRole('alert')).toContainElement(summary);
  });
});
