import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Payload,
  PayloadCreateInput,
  PayloadListItem,
  PayloadUpdateInput,
} from '../models/payload.model';

@Injectable({ providedIn: 'root' })
export class PayloadService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/payloads`;

  list(mine = false): Observable<PayloadListItem[]> {
    let params = new HttpParams();
    if (mine) params = params.set('mine', '1');
    return this.http.get<PayloadListItem[]>(this.baseUrl, { params });
  }

  get(id: string): Observable<Payload> {
    return this.http.get<Payload>(`${this.baseUrl}/${id}`);
  }

  create(input: PayloadCreateInput): Observable<Payload> {
    return this.http.post<Payload>(this.baseUrl, input);
  }

  update(id: string, input: PayloadUpdateInput): Observable<Payload> {
    return this.http.put<Payload>(`${this.baseUrl}/${id}`, input);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
