import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AdminReport,
  CreateReportPayload,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  ResolveReportPayload,
} from '../models/report.model';

/**
 * Report endpoints — both the user-facing POST /api/reports and the
 * admin-only listing/resolution routes. Kept in one service because they
 * share the same DTOs.
 */
@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reports`;
  private readonly adminUrl = `${environment.apiUrl}/admin/reports`;

  /**
   * File a new report against a public resource. Anyone (guest included) may
   * call this — backend rate-limits per IP/user. Returns the new report id on
   * 201; 429 means the rate limit kicked in.
   */
  submitReport(
    targetType: ReportTargetType,
    targetId: string,
    reason: ReportReason,
    details?: string,
  ): Observable<{ id: string }> {
    const body: CreateReportPayload = {
      target_type: targetType,
      target_id: targetId,
      reason,
    };
    const trimmed = details?.trim();
    if (trimmed) body.details = trimmed;
    return this.http.post<{ id: string }>(this.baseUrl, body);
  }

  /** Admin-only: list reports, optionally filtered by status (default pending). */
  listAdmin(status: ReportStatus = 'pending'): Observable<AdminReport[]> {
    const params = new HttpParams().set('status', status);
    return this.http
      .get<{ items: AdminReport[]; count: number }>(this.adminUrl, { params })
      .pipe(map(r => r.items ?? []));
  }

  /** Admin-only: resolve a report with one of dismiss/hide/remove/ban_user. */
  resolve(id: string, payload: ResolveReportPayload): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(`${this.adminUrl}/${id}/resolve`, payload);
  }
}
