import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, of, shareReplay, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

interface TenantTokenResponse {
  token: string;
  expiresAt: string;
  host: string | null;
}

export interface SearchHit {
  id: string;
  title: string;
  type: 'snippet' | 'payload' | 'tag';
  /** Only for snippets */
  language?: string;
  /** Only for payloads */
  category?: string;
  /** Only for tags */
  isOfficial?: boolean;
}

interface MeiliResponse<T> {
  hits: T[];
  estimatedTotalHits?: number;
}

interface SnippetHit {
  id: string;
  title: string;
  language: string;
  concept_id: string;
}

interface PayloadHit {
  id: string;
  title: string;
  category: string;
}

interface TagHit {
  id: string;
  name: string;
  isOfficial: boolean;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly http = inject(HttpClient);
  private tokenCache: { token: string; host: string; expiresAt: number } | null = null;

  /**
   * Multi-index search across snippets, payloads, and tags.
   * Returns a unified SearchHit[] sorted by relevance.
   */
  search(query: string, limit = 5): Observable<SearchHit[]> {
    if (!query.trim()) return of([]);

    return this.ensureToken().pipe(
      switchMap(({ token, host }) =>
        from(
          this.multiSearch(host, token, query, limit)
        )
      ),
    );
  }

  private async multiSearch(host: string, token: string, query: string, limit: number): Promise<SearchHit[]> {
    const body = {
      queries: [
        { indexUid: 'snippets', q: query, limit },
        { indexUid: 'payloads', q: query, limit },
        { indexUid: 'tags', q: query, limit: 3 },
      ],
    };

    const res = await fetch(`${host}/multi-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Meilisearch multi-search failed: HTTP ${res.status}`);
    }

    const data = await res.json() as { results: MeiliResponse<any>[] };

    const hits: SearchHit[] = [];

    // Snippets → map to concept navigation
    for (const hit of (data.results[0]?.hits ?? []) as SnippetHit[]) {
      hits.push({
        id: hit.concept_id ?? hit.id,
        title: hit.title,
        type: 'snippet',
        language: hit.language,
      });
    }

    // Payloads
    for (const hit of (data.results[1]?.hits ?? []) as PayloadHit[]) {
      hits.push({
        id: hit.id,
        title: hit.title,
        type: 'payload',
        category: hit.category,
      });
    }

    // Tags
    for (const hit of (data.results[2]?.hits ?? []) as TagHit[]) {
      hits.push({
        id: hit.id,
        title: hit.name,
        type: 'tag',
        isOfficial: hit.isOfficial,
      });
    }

    return hits;
  }

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
