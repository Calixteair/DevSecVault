import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, of, shareReplay, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TOOLS, ToolDef } from '../../features/it-tools/tools.catalog';

interface TenantTokenResponse {
  token: string;
  expiresAt: string;
  host: string | null;
}

export interface SearchHit {
  id: string;
  title: string;
  type: 'snippet' | 'payload' | 'tag' | 'tool';
  /** Only for snippets */
  language?: string;
  /** Only for payloads */
  category?: string;
  /** Only for tags */
  isOfficial?: boolean;
  /** Only for snippets/payloads — for filtering on results page */
  tags?: string[];
  /** Only for tools */
  description?: string;
  icon?: string;
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
  tags?: string[];
}

interface PayloadHit {
  id: string;
  title: string;
  category: string;
  tags?: string[];
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

  /** Dropdown search: small result set, fast. */
  search(query: string, limit = 5): Observable<SearchHit[]> {
    if (!query.trim()) return of([]);

    return this.ensureToken().pipe(
      switchMap(({ token, host }) =>
        from(this.multiSearch(host, token, query, limit, 3)),
      ),
      map(meiliHits => [...meiliHits, ...this.matchTools(query, limit)]),
    );
  }

  /** Full results page search: larger result set. */
  searchAll(query: string, limit = 50): Observable<SearchHit[]> {
    if (!query.trim()) return of([]);

    return this.ensureToken().pipe(
      switchMap(({ token, host }) =>
        from(this.multiSearch(host, token, query, limit, 20)),
      ),
      map(meiliHits => [...meiliHits, ...this.matchTools(query, limit)]),
    );
  }

  /** Filter IT Tools client-side against query (matches title/description/slug). */
  private matchTools(query: string, limit: number): SearchHit[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matches: SearchHit[] = [];
    for (const tool of TOOLS) {
      const hay = `${tool.title} ${tool.description} ${tool.slug} ${tool.category}`.toLowerCase();
      if (hay.includes(q)) {
        matches.push(this.toolToHit(tool));
        if (matches.length >= limit) break;
      }
    }
    return matches;
  }

  private toolToHit(tool: ToolDef): SearchHit {
    return {
      id: tool.slug,
      title: tool.title,
      type: 'tool',
      category: tool.category,
      description: tool.description,
      icon: tool.icon,
    };
  }

  private async multiSearch(
    host: string,
    token: string,
    query: string,
    perIndexLimit: number,
    tagLimit: number,
  ): Promise<SearchHit[]> {
    const body = {
      queries: [
        { indexUid: 'snippets', q: query, limit: perIndexLimit },
        { indexUid: 'payloads', q: query, limit: perIndexLimit },
        { indexUid: 'tags', q: query, limit: tagLimit },
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

    for (const hit of (data.results[0]?.hits ?? []) as SnippetHit[]) {
      hits.push({
        id: hit.concept_id ?? hit.id,
        title: hit.title,
        type: 'snippet',
        language: hit.language,
        tags: hit.tags ?? [],
      });
    }

    for (const hit of (data.results[1]?.hits ?? []) as PayloadHit[]) {
      hits.push({
        id: hit.id,
        title: hit.title,
        type: 'payload',
        category: hit.category,
        tags: hit.tags ?? [],
      });
    }

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
