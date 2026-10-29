// Tests for the sidebar health line: what each answer of `GET /health` (or no answer) looks like, in words.
import { Refine } from '@refinedev/core';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import type { Health } from '../types';
import { HealthIndicator } from './HealthIndicator';
import { describeHealth } from './healthStatus';

setupMockApi();

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <Refine dataProvider={{ getApiUrl: () => '' } as never} options={{ disableTelemetry: true }}>
      {children}
    </Refine>
  );
}

function answerWith(body: Health) {
  mockServer.use(http.get('*/health', () => HttpResponse.json(body)));
}

describe('describeHealth', () => {
  it('says "checking" until the first answer', () => {
    expect(describeHealth({ data: undefined, isError: false })).toEqual({
      tone: 'neutral',
      label: 'Checking API…',
    });
  });

  it('says "healthy" for ok', () => {
    expect(describeHealth({ data: { status: 'ok' }, isError: false })).toMatchObject({
      tone: 'good',
      label: 'API healthy',
    });
  });

  it('says "degraded" and names the dependencies that are down', () => {
    expect(
      describeHealth({
        data: { status: 'degraded', checks: { postgres: 'ok', redis: 'down' } },
        isError: false,
      }),
    ).toEqual({ tone: 'warn', label: 'API degraded', detail: 'redis down' });
    expect(describeHealth({ data: { status: 'degraded' }, isError: false }).detail).toBeUndefined();
  });

  it('uses the critical tone when the API itself reports "down"', () => {
    expect(
      describeHealth({
        data: { status: 'down', checks: { postgres: 'down', redis: 'down' } },
        isError: false,
      }),
    ).toEqual({ tone: 'crit', label: 'API degraded', detail: 'postgres down, redis down' });
  });

  it('treats any other status as degraded rather than healthy', () => {
    expect(describeHealth({ data: { status: 'starting' as never }, isError: false }).label).toBe(
      'API degraded',
    );
  });

  it('says "unreachable" when the last check failed, even if an earlier one worked', () => {
    expect(describeHealth({ data: { status: 'ok' }, isError: true })).toEqual({
      tone: 'crit',
      label: 'API unreachable',
    });
  });
});

describe('HealthIndicator', () => {
  it('waits, then shows "API healthy" and when it was checked', async () => {
    render(<HealthIndicator />, { wrapper: Wrapper });
    expect(screen.getByText('Checking API…')).toBeInTheDocument();
    expect(await screen.findByText('API healthy')).toBeInTheDocument();
    expect(screen.getByText(/^Checked \d{2}:\d{2}$/)).toBeInTheDocument();
    expect(screen.queryByText('Checking API…')).not.toBeInTheDocument();
  });

  it('names what is down when the API is degraded', async () => {
    answerWith({ status: 'degraded', checks: { postgres: 'ok', redis: 'down' } });
    render(<HealthIndicator />, { wrapper: Wrapper });
    expect(await screen.findByText('API degraded')).toBeInTheDocument();
    expect(screen.getByText('redis down')).toBeInTheDocument();
  });

  it('says "API unreachable" when the server answers with an error', async () => {
    mockServer.use(http.get('*/health', () => problem(503, 'UNAVAILABLE', 'Service unavailable')));
    render(<HealthIndicator />, { wrapper: Wrapper });
    expect(await screen.findByText('API unreachable')).toBeInTheDocument();
    expect(screen.getByText(/^Checked \d{2}:\d{2}$/)).toBeInTheDocument();
  });

  it('says "API unreachable" when there is no answer at all', async () => {
    mockServer.use(http.get('*/health', () => HttpResponse.error()));
    render(<HealthIndicator />, { wrapper: Wrapper });
    expect(await screen.findByText('API unreachable')).toBeInTheDocument();
  });

  it('never relies on the dot alone: the state is in words and the dot is decorative', async () => {
    const { container } = render(<HealthIndicator />, { wrapper: Wrapper });
    await screen.findByText('API healthy');
    const dot = container.querySelector('.dot');
    expect(dot).toHaveAttribute('aria-hidden', 'true');
    expect(dot).toHaveClass('bg-good-dot');
  });
});
