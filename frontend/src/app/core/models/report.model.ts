/**
 * Public-facing types used by ReportService and the report UI components.
 *
 * Mirrors the backend enums declared on the Report entity. Values are kept as
 * lower-case strings to match the JSON contract (POST /api/reports). Adding a
 * new variant here without touching the backend list will not break the UI —
 * the dropdown will simply show an option the API rejects with a 400.
 */

/** Resource kind referenced by a report. Must match the API enum. */
export type ReportTargetType = 'concept' | 'snippet' | 'payload';

/**
 * Report reasons. Order in this list drives the dropdown order in the
 * report dialog.
 */
export type ReportReason =
  | 'illegal_content'
  | 'malware_distribution'
  | 'phishing'
  | 'copyright'
  | 'spam'
  | 'csam'
  | 'terrorism'
  | 'other';

/** Lifecycle status used by the admin reports page. Matches the four backend states. */
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned';

/** Action sent on POST /api/admin/reports/:id/resolve. */
export type ReportResolveAction = 'dismiss' | 'hide' | 'remove' | 'ban_user';

/** Light snapshot of the reported resource shown to the moderator. */
export interface ReportTargetPreview {
  title?: string | null;
  description?: string | null;
  owner_id?: string | null;
}

/** Light snapshot of the reporter shown to the moderator. */
export interface ReportReporter {
  id: string;
  username: string;
}

/** Body for POST /api/reports. */
export interface CreateReportPayload {
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  details?: string;
}

/** Body for POST /api/admin/reports/:id/resolve. */
export interface ResolveReportPayload {
  action: ReportResolveAction;
  notes?: string;
}

/** Row returned by GET /api/admin/reports?status=pending. */
export interface AdminReport {
  id: string;
  target_type: ReportTargetType;
  target_id: string;
  target_preview: ReportTargetPreview | null;
  reporter: ReportReporter | null;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  created_at: string;
}
