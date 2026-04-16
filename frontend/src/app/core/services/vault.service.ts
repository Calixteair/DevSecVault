import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  VaultEntry,
  VaultFailedAttemptResult,
  VaultUpsertInput,
} from '../models/vault.model';

@Injectable({ providedIn: 'root' })
export class VaultService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vault`;

  get(): Observable<VaultEntry> {
    return this.http.get<VaultEntry>(this.baseUrl);
  }

  upsert(input: VaultUpsertInput): Observable<VaultEntry> {
    return this.http.put<VaultEntry>(this.baseUrl, input);
  }

  clear(): Observable<void> {
    return this.http.delete<void>(this.baseUrl);
  }

  reportFailedAttempt(): Observable<VaultFailedAttemptResult> {
    return this.http.post<VaultFailedAttemptResult>(`${this.baseUrl}/failed-attempt`, {});
  }
}
