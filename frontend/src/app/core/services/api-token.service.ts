import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiToken,
  ApiTokenCreated,
  CreateApiTokenPayload,
} from '../models/api-token.model';

@Injectable({ providedIn: 'root' })
export class ApiTokenService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/me/tokens`;

  list(): Observable<ApiToken[]> {
    return this.http.get<ApiToken[]>(this.baseUrl);
  }

  create(payload: CreateApiTokenPayload): Observable<ApiTokenCreated> {
    return this.http.post<ApiTokenCreated>(this.baseUrl, payload);
  }

  revoke(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
