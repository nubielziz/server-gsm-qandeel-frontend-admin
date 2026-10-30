// Registers the CRUD resources of the storefront feature for Refine's data hooks (decision 005). The data provider calls
// these same typed functions, so the lists and the single records have one code path. `app/resources.ts` merges the registry.
import type { ResourceRegistry } from '@/lib/api';
import { createContentPage, getContentPage, listContentPages, updateContentPage } from './contentPages';
import { createHelpArticle, getHelpArticle, listHelpArticles, updateHelpArticle } from './helpArticles';
import { createLegalDocument, getLegalDocument, listLegalDocuments } from './legalDocuments';
import { createListing, getListing, listListings, updateListing } from './listings';
import { createTacEntry, getTacEntry, listTacEntries, updateTacEntry } from './tacCatalog';

/** Each resource lists only the operations its endpoints offer: legal documents are written and published, never edited or deleted. */
export const storefrontResources: ResourceRegistry = {
  'service-listings': { list: listListings, show: getListing, create: createListing, update: updateListing },
  'content-pages': {
    list: listContentPages,
    show: getContentPage,
    create: createContentPage,
    update: updateContentPage,
  },
  'help-articles': {
    list: listHelpArticles,
    show: getHelpArticle,
    create: createHelpArticle,
    update: updateHelpArticle,
  },
  'legal-documents': { list: listLegalDocuments, show: getLegalDocument, create: createLegalDocument },
  'tac-catalog': { list: listTacEntries, show: getTacEntry, create: createTacEntry, update: updateTacEntry },
};
