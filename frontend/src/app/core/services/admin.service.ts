import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminPublicContent, AdminStats, AdminUser, AdminUserPage } from '../models/admin.model';

/**
 * Thin wrapper around /api/admin/* endpoints. Kept separate from TagService
 * because tag-admin operations are already there — this service holds the
 * global dashboard views (stats + public moderation listing).
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  stats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${environment.apiUrl}/admin/stats`);
  }

  publicContent(query = ''): Observable<AdminPublicContent> {
    let params = new HttpParams();
    if (query.trim()) {
      params = params.set('q', query.trim());
    }
    return this.http.get<AdminPublicContent>(
      `${environment.apiUrl}/admin/public-content`,
      { params },
    );
  }

  listUsers(query = '', page = 1): Observable<AdminUserPage> {
    let params = new HttpParams().set('page', String(page));
    if (query.trim()) {
      params = params.set('q', query.trim());
    }
    return this.http.get<AdminUserPage>(`${environment.apiUrl}/admin/users`, { params });
  }

  banUser(id: string): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${environment.apiUrl}/admin/users/${id}/ban`, {});
  }

  unbanUser(id: string): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${environment.apiUrl}/admin/users/${id}/unban`, {});
  }
}
