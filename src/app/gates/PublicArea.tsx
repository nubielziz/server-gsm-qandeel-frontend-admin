// PublicArea: wraps the sign-in screens. Reaching one means nobody is signed in, so what the last session loaded is dropped.
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { keepForSignIn } from './signInQueries';

/**
 * Every way out of a session (sign-out, expiry, a blocked account) ends on a sign-in screen. Clearing the cached
 * records there keeps one staff member's data (and name and permissions) from showing to the next person who signs
 * in on this browser tab.
 */
export function PublicArea() {
  const queryClient = useQueryClient();
  useEffect(() => {
    queryClient.removeQueries({ predicate: (query) => !keepForSignIn(query) });
  }, [queryClient]);
  return <Outlet />;
}
