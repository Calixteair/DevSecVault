import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TeamDetail,
  TeamInviteLink,
  TeamResources,
  TeamSummary,
} from '../models/team.model';

@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/teams`;
  private readonly invitesUrl = `${environment.apiUrl}/team-invites`;

  list(): Observable<TeamSummary[]> {
    return this.http.get<TeamSummary[]>(this.baseUrl);
  }

  get(id: string): Observable<TeamDetail> {
    return this.http.get<TeamDetail>(`${this.baseUrl}/${id}`);
  }

  create(name: string): Observable<TeamSummary> {
    return this.http.post<TeamSummary>(this.baseUrl, { name });
  }

  rename(id: string, name: string): Observable<TeamSummary> {
    return this.http.patch<TeamSummary>(`${this.baseUrl}/${id}`, { name });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  leave(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/leave`, {});
  }

  transferLead(id: string, userId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/transfer-lead`, { userId });
  }

  kick(id: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/members/${userId}`);
  }

  resources(id: string): Observable<TeamResources> {
    return this.http.get<TeamResources>(`${this.baseUrl}/${id}/resources`);
  }

  listInviteLinks(teamId: string): Observable<TeamInviteLink[]> {
    return this.http.get<TeamInviteLink[]>(`${this.baseUrl}/${teamId}/invites`);
  }

  createInviteLink(teamId: string, expiresInDays?: number): Observable<TeamInviteLink> {
    const body = expiresInDays !== undefined ? { expiresInDays } : {};
    return this.http.post<TeamInviteLink>(`${this.baseUrl}/${teamId}/invites`, body);
  }

  revokeInviteLink(teamId: string, token: string): Observable<TeamInviteLink> {
    return this.http.patch<TeamInviteLink>(`${this.baseUrl}/${teamId}/invites/${token}`, { isActive: false });
  }

  enableInviteLink(teamId: string, token: string): Observable<TeamInviteLink> {
    return this.http.patch<TeamInviteLink>(`${this.baseUrl}/${teamId}/invites/${token}`, { isActive: true });
  }

  deleteInviteLink(teamId: string, token: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${teamId}/invites/${token}`);
  }

  acceptInvite(token: string): Observable<TeamSummary> {
    return this.http.post<TeamSummary>(`${this.invitesUrl}/accept`, { token });
  }
}
