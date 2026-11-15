// The React context that carries the page's stream client from <StreamProvider/> to the hooks. Without a provider the hooks do nothing and the status stays `idle`.
import { createContext } from 'react';
import type { StreamClient } from './streamEnv';

export const StreamContext = createContext<StreamClient | null>(null);
