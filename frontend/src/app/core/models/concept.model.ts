export interface Snippet {
  id?: string;
  language: string;
  code: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tag {
  id: string;
  name: string;
  isOfficial: boolean;
}

export interface ConceptOwner {
  id: string;
  username: string;
}

/** Shape returned inside `concept.sharedTeams[]` / `payload.sharedTeams[]`. */
export interface SharedTeamRef {
  id: string;
  name: string;
}

export interface Concept {
  id: string;
  title: string;
  description: string | null;
  visibility: 'public' | 'private' | 'team';
  owner: ConceptOwner;
  tags: Tag[];
  snippets: Snippet[];
  snippetCount?: number;
  teamId: string | null;
  sharedTeams?: SharedTeamRef[];
  createdAt: string;
  updatedAt: string;
}

export interface ConceptListItem {
  id: string;
  title: string;
  description: string | null;
  visibility: 'public' | 'private' | 'team';
  owner: ConceptOwner;
  tags: Tag[];
  snippetCount: number;
  languages: string[];
  sharedTeams?: SharedTeamRef[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateConceptPayload {
  title: string;
  description?: string;
  visibility: 'public' | 'private' | 'team';
  tags?: string[];
  snippets?: { language: string; code: string; sortOrder: number }[];
  /** Required (non-empty) when visibility='team'; omitted otherwise. */
  sharedTeamIds?: string[];
}

export interface UpdateConceptPayload {
  title?: string;
  description?: string;
  visibility?: 'public' | 'private' | 'team';
  tags?: string[];
  /** Include to replace the shared-teams set. Required when flipping to 'team'. */
  sharedTeamIds?: string[];
}

export interface CreateSnippetPayload {
  language: string;
  code: string;
  sortOrder?: number;
}

export interface UpdateSnippetPayload {
  language?: string;
  code?: string;
  sortOrder?: number;
}
