import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoteStub } from '@/components/VoteStub';
import { applyVote, useRequest } from '@/lib/hooks';

/** Fake API with one request, vote state is kept in `server` */
let server: { voteCount: number; hasVoted: boolean };
let voteCalls: string[];
let voteHandler: (method: string) => Promise<Response>;
let readsFail: boolean;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  server = { voteCount: 3, hasVoted: false };
  voteCalls = [];
  readsFail = false;
  voteHandler = async (method) => {
    server = method === 'PUT' ? { voteCount: 4, hasVoted: true } : { voteCount: 3, hasVoted: false };
    return json({ requestId: 'r1', ...server });
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (url.endsWith('/requests/r1/vote')) {
        voteCalls.push(method);
        return voteHandler(method);
      }
      if (url.endsWith('/requests/r1')) {
        if (readsFail) return json({ error: { code: 'INTERNAL_ERROR', message: 'down' } }, 500);
        return json({ id: 'r1', title: 'Dark mode', ...server, statusHistory: [] });
      }
      return json({ error: { code: 'NOT_FOUND', message: 'nope' } }, 404);
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

/** Render the button like the app does, numbers come from the query cache */
function Harness() {
  const { data } = useRequest('r1');
  return data ? <VoteStub request={data} /> : <p>loading</p>;
}

function renderHarness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Harness />
    </QueryClientProvider>,
  );
}

describe('VoteStub (optimistic voting)', () => {
  it('shows the new count immediately, before the server answers', async () => {
    let release!: () => void;
    voteHandler = (method) =>
      new Promise((resolve) => {
        release = () => {
          server = { voteCount: 4, hasVoted: true };
          resolve(json({ requestId: 'r1', ...server }));
        };
        void method;
      });

    renderHarness();
    const button = await screen.findByRole('button', { name: /vote for dark mode/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveTextContent('3');

    await userEvent.click(button);

    // request still pending but the screen already shows 4
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveTextContent('4');
    expect(voteCalls).toEqual(['PUT']);

    release();
    await waitFor(() => expect(button).toBeEnabled());
    expect(button).toHaveTextContent('4');
  });

  it('rolls back and explains when the server rejects the vote', async () => {
    voteHandler = async () => json({ error: { code: 'INTERNAL_ERROR', message: 'boom' } }, 500);

    renderHarness();
    const button = await screen.findByRole('button', { name: /vote for dark mode/i });
    // refetch fails from here on, so only a real rollback can restore the number
    readsFail = true;
    await userEvent.click(button);

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t save your vote/i);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'));
    expect(button).toHaveTextContent('3');
  });

  it('cannot be double-clicked: the button is disabled while a vote is being saved', async () => {
    let release!: () => void;
    voteHandler = () =>
      new Promise((resolve) => {
        release = () => {
          server = { voteCount: 4, hasVoted: true };
          resolve(json({ requestId: 'r1', ...server }));
        };
      });

    renderHarness();
    const button = await screen.findByRole('button', { name: /vote for dark mode/i });
    await userEvent.click(button);
    expect(button).toBeDisabled();
    await userEvent.click(button); // ignored
    expect(voteCalls).toEqual(['PUT']);

    release();
    await waitFor(() => expect(button).toBeEnabled());
  });

  it('removes a vote with DELETE when you click again', async () => {
    server = { voteCount: 4, hasVoted: true };
    renderHarness();
    const button = await screen.findByRole('button', { name: /vote for dark mode/i });
    expect(button).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'));
    expect(button).toHaveTextContent('3');
    expect(voteCalls).toEqual(['DELETE']);
  });
});

describe('applyVote', () => {
  it('adds one, removes one, and never counts twice', () => {
    const item = { voteCount: 3, hasVoted: false };
    expect(applyVote(item, true)).toEqual({ voteCount: 4, hasVoted: true });
    expect(applyVote({ voteCount: 4, hasVoted: true }, false)).toEqual({ voteCount: 3, hasVoted: false });
    // repeating the same action does nothing
    expect(applyVote({ voteCount: 4, hasVoted: true }, true)).toEqual({ voteCount: 4, hasVoted: true });
    expect(applyVote(item, false)).toEqual(item);
  });
});
