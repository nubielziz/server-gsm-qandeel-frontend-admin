// RedirectWhenSignedIn: a signed-in visitor of a sign-in screen goes on to the page they asked for (`?to=`) or the home page.
import { Navigate } from 'react-router';
import { useDestination } from '@/features/auth';

export function RedirectWhenSignedIn() {
  const { destination } = useDestination();
  return <Navigate to={destination} replace />;
}
