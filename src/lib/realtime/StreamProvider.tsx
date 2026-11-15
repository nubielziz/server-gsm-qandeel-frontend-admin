// <StreamProvider/>: starts the staff member's live stream once the staff member is known and stops it at sign-out. Mounted once in the app shell.
import { useGetIdentity } from '@refinedev/core';
import { useEffect, useState, type ReactNode } from 'react';
import { canOpenStream, createStaffStreamClient } from './browserEnv';
import { StreamContext } from './streamContext';
import type { StreamClient } from './streamEnv';

/**
 * Owns the page's stream client and shares it with `useStreamEvent` and `useStreamStatus`. The stream starts when Refine's identity has data (the same
 * "signed in" signal as `useMe()`; `lib` may not import the auth feature) and stops when it goes, so a signed-out page never opens one. A browser
 * without `EventSource` opens none and the screens keep polling. `client` lets a test hand in its own.
 */
export function StreamProvider({ children, client }: { children: ReactNode; client?: StreamClient }) {
  const { data: identity } = useGetIdentity();
  const signedIn = identity !== undefined;
  const [active] = useState(() => client ?? createStaffStreamClient());

  useEffect(() => {
    if (!signedIn || (!client && !canOpenStream())) return;
    active.start();
    return () => active.stop();
  }, [signedIn, active, client]);

  return <StreamContext.Provider value={active}>{children}</StreamContext.Provider>;
}
