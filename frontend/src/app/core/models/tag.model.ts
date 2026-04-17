/**
 * Plain tag — the shape nested inside Concept.tags / Payload.tags and returned
 * by GET /api/tags. Matches backend `tag:read` serialization group.
 */
export interface Tag {
  id: string;
  name: string;
  isOfficial: boolean;
}

/**
 * Admin-listing projection enriched with aggregate usage counts. Returned
 * by GET /api/admin/tags.
 */
export interface AdminTag extends Tag {
  createdAt: string;
  conceptCount: number;
  payloadCount: number;
  usageCount: number;
}

/**
 * A single result from the Meilisearch `tags` index. Same wire shape as the
 * documents we push from `TagIndexer::toDocument`.
 */
export interface TagSearchHit {
  id: string;
  name: string;
  isOfficial: boolean;
  usageCount: number;
}

export interface AdminTagUpdatePayload {
  name?: string;
  isOfficial?: boolean;
}

export interface AdminTagMergeResult {
  mergedInto: Tag & { createdAt: string };
  reassignedConcepts: number;
  reassignedPayloads: number;
}

export interface AdminTagDeleteResult {
  deleted: boolean;
  detachedConcepts: number;
  detachedPayloads: number;
}
