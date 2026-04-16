/**
 * Shared helpers for IT Tool components.
 */

/** Copy text to clipboard. Returns true on success. */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Common CSS shared by every tool. Exposed as a string so each standalone
 * component can inline it via `styles: [TOOL_STYLES, '...']` without duplicating.
 *
 * Design language: "Terminal Atelier" — monospace-forward, rail-accented,
 * editorial spacing. The card is the atom; everything stacks cleanly under
 * 640px so the same tool reads on desk and on phone.
 */
export const TOOL_STYLES = `
  .card {
    position: relative;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }
  .card-title {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted-foreground);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-bottom: 0.625rem;
    border-bottom: 1px solid var(--border);
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    font-size: 0.75rem;
    font-family: 'JetBrains Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted-foreground);
  }
  input[type="text"], input[type="number"], input[type="password"],
  select, textarea {
    width: 100%;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8125rem;
    padding: 0.5rem 0.625rem;
    background: var(--input-background);
    border: 1px solid var(--input);
    border-radius: calc(var(--radius) - 2px);
    color: var(--foreground);
    outline: none;
    text-transform: none;
    letter-spacing: normal;
  }
  input:focus, select:focus, textarea:focus {
    border-color: var(--ring);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 18%, transparent);
  }
  textarea {
    min-height: 7rem;
    resize: vertical;
    line-height: 1.5;
  }
  input[type="checkbox"] {
    width: auto;
    accent-color: var(--primary);
  }
  input[type="range"] {
    width: 100%;
    accent-color: var(--primary);
  }

  .row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: 0.75rem;
  }
  .output-row {
    display: flex;
    align-items: stretch;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .output-row input,
  .output-row .output-val {
    flex: 1;
    min-width: 0;
  }
  .output-val {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8125rem;
    padding: 0.5rem 0.625rem;
    background: color-mix(in srgb, var(--secondary) 60%, transparent);
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) - 2px);
    color: var(--foreground);
    word-break: break-all;
    white-space: pre-wrap;
    min-height: 1em;
    min-width: 0;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    height: 2.25rem;
    padding: 0 0.875rem;
    border-radius: calc(var(--radius) - 2px);
    border: 1px solid var(--border);
    background: var(--secondary);
    color: var(--foreground);
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
  }
  .btn:hover {
    background: var(--muted);
    border-color: var(--muted-foreground);
  }
  .btn:active { transform: translateY(1px); }
  .btn-primary {
    background: var(--primary);
    color: var(--primary-foreground);
    border-color: var(--primary);
  }
  .btn-primary:hover {
    background: var(--primary);
    border-color: var(--primary);
    filter: brightness(1.08);
  }
  .btn-copy {
    flex-shrink: 0;
    width: 2.25rem;
    padding: 0;
  }
  .btn-copy.copied { color: var(--primary); border-color: var(--primary); }
  .error {
    color: var(--destructive);
    font-size: 0.8125rem;
    font-family: 'JetBrains Mono', monospace;
    padding: 0.625rem 0.75rem;
    background: color-mix(in srgb, var(--destructive) 8%, transparent);
    border-left: 3px solid var(--destructive);
    border-radius: 2px;
  }
  .meta {
    font-size: 0.6875rem;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.04em;
    color: var(--muted-foreground);
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .kv {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.5rem 1.25rem;
    font-size: 0.8125rem;
    font-family: 'JetBrains Mono', monospace;
  }
  .kv dt {
    color: var(--muted-foreground);
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    align-self: center;
  }
  .kv dd {
    margin: 0;
    color: var(--foreground);
    word-break: break-all;
  }

  /* Tablet breakpoint — tighten spacing */
  @media (max-width: 768px) {
    .card { padding: 1rem; }
    .row { grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: 0.625rem; }
  }

  /* Phone breakpoint — collapse multi-column patterns */
  @media (max-width: 560px) {
    .card {
      padding: 0.875rem;
      border-radius: calc(var(--radius) - 2px);
    }
    .card-title { font-size: 0.6875rem; padding-bottom: 0.5rem; }
    .row { grid-template-columns: 1fr; }
    .kv { grid-template-columns: 1fr; gap: 0.125rem 0; }
    .kv dt { padding-top: 0.5rem; }
    .kv dt:first-of-type { padding-top: 0; }
    .output-row { flex-direction: column; align-items: stretch; }
    .btn-copy { width: 100%; }
    textarea { min-height: 6rem; }
  }
`;
