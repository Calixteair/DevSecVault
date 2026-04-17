import { ConceptListItem } from './concept.model';
import { PayloadListItem } from './payload.model';

/**
 * Aggregate counters shown on the admin dashboard home. Returned by
 * GET /api/admin/stats.
 */
export interface AdminStats {
  users: number;
  teams: number;
  tags: {
    total: number;
    official: number;
  };
  concepts: {
    total: number;
    public: number;
    team: number;
    private: number;
  };
  payloads: {
    total: number;
    public: number;
    team: number;
    private: number;
  };
}

/**
 * Moderation payload: public concepts + payloads combined, optionally
 * filtered by title. Returned by GET /api/admin/public-content.
 */
export interface AdminPublicContent {
  concepts: ConceptListItem[];
  payloads: PayloadListItem[];
}
