import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  SecretLinkCreateInput,
  SecretLinkCreated,
  SecretLinkRead,
} from '../models/secret-link.model';

@Injectable({ providedIn: 'root' })
export class SecretLinkService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/secret-links`;

  create(input: SecretLinkCreateInput): Observable<SecretLinkCreated> {
    return this.http.post<SecretLinkCreated>(this.baseUrl, input);
  }

  get(id: string): Observable<SecretLinkRead> {
    return this.http.get<SecretLinkRead>(`${this.baseUrl}/${id}`);
  }

  consume(id: string): Observable<{ consumed: boolean }> {
    return this.http.post<{ consumed: boolean }>(`${this.baseUrl}/${id}/consume`, {});
  }
}
