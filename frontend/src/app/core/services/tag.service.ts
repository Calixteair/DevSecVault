import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, of, shareReplay, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminTag,
  AdminTagDeleteResult,
  AdminTagMergeResult,
  AdminTagUpdatePayload,
  Tag,
  TagSearchHit,
} from '../models/tag.model';

interface TenantTokenResponse {
  token: string;
  expiresAt: string;
  host: string | null;
}

interface MeiliSearchResponse<T> {
  hits: T[];
  estimatedTotalHits?: number;
}

@Injectable({ providedIn: 'root' })
export class TagService {
  private readonly http = inject(HttpClient);

  /** Shared per-session tenant token; refreshed lazily on 401/expiry. */
  private tokenCache: { token: string; host: string; expiresAt: number } | null = null;

  // ---------------------------------------------------------------------------
  // Regular (non-admin) endpoints
  // ---------------------------------------------------------------------------

  /** GET /api/tags — fallback listing when Meilisearch is unavailable. */
  listAll(): Observable<Tag[]> {
    return this.http.get<Tag[]>(`${environment.apiUrl}/tags`);
  }

  /**
   * Autocomplete via Meilisearch. Returns hits sorted by officialness desc,
   * then usage count desc — leveraging the ranking rules set in TagIndexer.
   */
  search(query: string, limit = 10): Observable<TagSearchHit[]> {
    return this.ensureToken().pipe(
      switchMap(({ token, host }) =>
        from(
          fetch(`${host}/indexes/tags/search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              q: query,
              limit,
              // Prefer official tags first, then most-used.
              sort: ['isOfficial:desc', 'usageCount:desc'],
            }),
          }).then(res => {
            if (!res.ok) {
              throw new Error(`Meilisearch search failed: HTTP ${res.status}`);
            }
            return res.json() as Promise<MeiliSearchResponse<TagSearchHit>>;
          }),
        ),
      ),
      map(res => res.hits ?? []),
    );
  }

  // ---------------------------------------------------------------------------
  // Admin endpoints (require ROLE_ADMIN; backend enforces it)
  // ---------------------------------------------------------------------------

  adminList(): Observable<AdminTag[]> {
    return this.http.get<AdminTag[]>(`${environment.apiUrl}/admin/tags`);
  }

  adminCreate(payload: { name: string; isOfficial?: boolean }): Observable<Tag> {
    return this.http.post<Tag>(`${environment.apiUrl}/admin/tags`, payload);
  }

  adminUpdate(id: string, payload: AdminTagUpdatePayload): Observable<Tag> {
    return this.http.patch<Tag>(`${environment.apiUrl}/admin/tags/${id}`, payload);
  }

  adminMerge(sourceId: string, targetId: string): Observable<AdminTagMergeResult> {
    return this.http.post<AdminTagMergeResult>(
      `${environment.apiUrl}/admin/tags/${sourceId}/merge/${targetId}`,
      {},
    );
  }

  adminDelete(id: string): Observable<AdminTagDeleteResult> {
    return this.http.delete<AdminTagDeleteResult>(`${environment.apiUrl}/admin/tags/${id}`);
  }

  // ---------------------------------------------------------------------------
  // Tenant-token plumbing
  // ---------------------------------------------------------------------------

  /** Fetch-or-reuse the Meilisearch tenant token and the public host URL. */
  private ensureToken(): Observable<{ token: string; host: string }> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt - 60_000 > now) {
      return of({ token: this.tokenCache.token, host: this.tokenCache.host });
    }

    return this.http.get<TenantTokenResponse>(`${environment.apiUrl}/search/token`).pipe(
      map(res => {
        if (!res.host) {
          throw new Error('Meilisearch public URL is not configured on the server.');
        }
        const host = res.host.replace(/\/$/, '');
        this.tokenCache = {
          token: res.token,
          host,
          expiresAt: new Date(res.expiresAt).getTime(),
        };
        return { token: res.token, host };
      }),
      shareReplay(1),
    );
  }
}
