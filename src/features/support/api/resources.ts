// Registers the CRUD resources of the support feature for Refine's data hooks (decision 005). The data provider calls these
// same typed functions, so the inbox, the open thread and the template list have one code path. `app/resources.ts` merges the registry.
import type { ResourceRegistry } from '@/lib/api';
import {
  createReplyTemplate,
  deleteReplyTemplate,
  getReplyTemplate,
  listReplyTemplates,
  updateReplyTemplate,
} from './templates';
import { getSupportTicket, listSupportTickets, updateSupportTicket } from './tickets';

/** Tickets are written by customers, so staff cannot create or delete them; every answer is an action endpoint. */
export const supportResources: ResourceRegistry = {
  'support-tickets': { list: listSupportTickets, show: getSupportTicket, update: updateSupportTicket },
  'reply-templates': {
    list: listReplyTemplates,
    show: getReplyTemplate,
    create: createReplyTemplate,
    update: updateReplyTemplate,
    delete: deleteReplyTemplate,
  },
};
