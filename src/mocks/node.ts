// The same handlers for Vitest: `mockServer.listen()` in a test file's setup, `resetHandlers()` after each test.
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const mockServer = setupServer(...handlers);
