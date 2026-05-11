import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  Code,
  Wrench,
  Send,
  Hammer,
  Users,
  Shield,
  Plus,
  Share2,
  Search,
  ArrowUpRight,
  Activity,
  Settings,
} from 'lucide-angular';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { SeoService } from '../../core/services/seo.service';
import { DashboardData, ActivityItem } from '../../core/models/dashboard.model';

const icons = { Code, Wrench, Send, Hammer, Users, Shield, Plus, Share2, Search, ArrowUpRight, Activity, Settings };

interface ModuleRow {
  id: string;
  path: string;
  label: string;
  items: number;
  lastActivity: string;
  icon: string;
}

interface CmdSuggestion {
  kbd: string;
  verb: string;
  detail: string;
  target: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [LucideAngularModule, RouterLink],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <div class="page">
      <!-- ========== Block 1 : status line ========== -->
      <div class="status font-mono" role="status">
        <span class="status-pill">
          <span class="status-dot" aria-hidden="true"></span>
          <span>vault online</span>
        </span>
        <span class="status-sep">·</span>
        <span class="status-item"><span class="status-label">time</span>{{ currentTime() }}</span>
        <span class="status-sep">·</span>
        <span class="status-item"><span class="status-label">items</span>{{ totalItems() }}</span>
        <span class="status-sep">·</span>
        <span class="status-item"><span class="status-label">last sync</span>{{ lastSync() }}</span>
        @if (isAuthenticated()) {
          <span class="status-sep">·</span>
          <span class="status-item"><span class="status-label">session</span>auth</span>
        } @else {
          <span class="status-sep">·</span>
          <span class="status-item status-guest"><span class="status-label">session</span>guest</span>
        }
      </div>

      @if (isAuthenticated()) {
        <!-- ========== Block 2 : header ========== -->
        <header class="head">
          <h1 class="head-title">
            <span class="head-prompt font-mono">&gt;_</span>
            Dashboard
          </h1>
          <p class="head-subtitle">
            Console centrale du coffre. Tape une commande, parcours l'historique, ouvre un module.
          </p>
        </header>

        <!-- ========== Block 3 : command suggestions ========== -->
        <section class="cmds" aria-label="Commandes rapides">
          <div class="block-head font-mono">
            <span class="block-sigil">[01]</span>
            <span>quick commands</span>
            <span class="block-fill" aria-hidden="true"></span>
            <span class="block-hint">⌘K to focus</span>
          </div>
          <ul class="cmd-list">
            @for (cmd of suggestions; track cmd.kbd) {
              <li>
                <a [routerLink]="cmd.path" class="cmd-row">
                  <kbd class="cmd-key">{{ cmd.kbd }}</kbd>
                  <span class="cmd-verb font-mono">{{ cmd.verb }}</span>
                  <span class="cmd-detail">{{ cmd.detail }}</span>
                  <span class="cmd-target font-mono">→ {{ cmd.target }}</span>
                  <lucide-icon name="arrow-up-right" [size]="14" [strokeWidth]="1.75" class="cmd-arrow"></lucide-icon>
                </a>
              </li>
            }
          </ul>
        </section>

        <!-- ========== Block 4 : timeline ========== -->
        <section class="timeline" aria-label="Activité récente">
          <div class="block-head font-mono">
            <span class="block-sigil">[02]</span>
            <span>recent timeline</span>
            <span class="block-fill" aria-hidden="true"></span>
            <span class="block-hint">{{ data()?.recentActivity?.length ?? 0 }} events</span>
          </div>
          <ol class="tl-list">
            @for (item of data()?.recentActivity ?? []; track item.id + item.timestamp) {
              <li>
                <button class="tl-row" (click)="navigateToItem(item)" type="button">
                  <span class="tl-time font-mono">{{ formatClock(item.timestamp) }}</span>
                  <span class="tl-verb font-mono" [class]="'verb-' + item.action">
                    {{ item.action === 'created' ? 'CREATE' : 'UPDATE' }}
                  </span>
                  <span class="tl-kind font-mono">{{ item.type }}</span>
                  <span class="tl-title">{{ item.title }}</span>
                  <span class="tl-target font-mono">→ {{ item.type === 'concept' ? 'dev-library' : 'cyber-toolbox' }}</span>
                  <span class="tl-ago font-mono">{{ formatTime(item.timestamp) }}</span>
                </button>
              </li>
            } @empty {
              <li class="tl-empty font-mono">
                <span class="tl-empty-cursor">_</span>
                <span>no activity yet</span>
              </li>
            }
          </ol>
        </section>

        <!-- ========== Block 5 : module counters ========== -->
        <section class="modules" aria-label="Modules">
          <div class="block-head font-mono">
            <span class="block-sigil">[03]</span>
            <span>modules</span>
            <span class="block-fill" aria-hidden="true"></span>
            <span class="block-hint">{{ moduleRows().length }} entries</span>
          </div>
          <div class="mod-table" role="table">
            <div class="mod-thead font-mono" role="row">
              <span role="columnheader">module</span>
              <span role="columnheader" class="num">items</span>
              <span role="columnheader">last activity</span>
              <span role="columnheader" aria-label="action"></span>
            </div>
            @for (mod of moduleRows(); track mod.id) {
              <a [routerLink]="mod.path" class="mod-row" role="row">
                <span class="mod-name" role="cell">
                  <lucide-icon [name]="mod.icon" [size]="14" [strokeWidth]="1.75" class="mod-icon"></lucide-icon>
                  <span class="font-mono">{{ mod.label }}</span>
                </span>
                <span class="mod-items font-mono num" role="cell">{{ mod.items }}</span>
                <span class="mod-last font-mono" role="cell">{{ mod.lastActivity }}</span>
                <span class="mod-cta font-mono" role="cell">
                  open
                  <lucide-icon name="arrow-up-right" [size]="12" [strokeWidth]="2"></lucide-icon>
                </span>
              </a>
            }
          </div>
        </section>
      } @else {
        <!-- ========== Guest minimal ========== -->
        <section class="guest">
          <header class="head">
            <h1 class="head-title">
              <span class="head-prompt font-mono">&gt;_</span>
              Welcome
            </h1>
            <p class="head-subtitle guest-lead">
              DevSecVault est une console cybersec auto-hébergée : bibliothèque de snippets,
              payloads chiffrés AES-256, partage de secrets E2E, et utilitaires IT. Connectez-vous
              pour ouvrir votre coffre, ou explorez les modules publics ci-dessous.
            </p>
          </header>

          <div class="guest-links font-mono">
            <a routerLink="/dev-library" class="guest-link">
              <span class="guest-link-tag">[01]</span>
              <span class="guest-link-name">dev-library</span>
              <span class="guest-link-desc">code snippets, multi-langage</span>
              <lucide-icon name="arrow-up-right" [size]="14" [strokeWidth]="1.75"></lucide-icon>
            </a>
            <a routerLink="/it-tools" class="guest-link">
              <span class="guest-link-tag">[02]</span>
              <span class="guest-link-name">it-tools</span>
              <span class="guest-link-desc">conversion, subnet, json, 100% local</span>
              <lucide-icon name="arrow-up-right" [size]="14" [strokeWidth]="1.75"></lucide-icon>
            </a>
            <a routerLink="/secure-bridge" class="guest-link">
              <span class="guest-link-tag">[03]</span>
              <span class="guest-link-name">secure-bridge</span>
              <span class="guest-link-desc">share secrets end-to-end</span>
              <lucide-icon name="arrow-up-right" [size]="14" [strokeWidth]="1.75"></lucide-icon>
            </a>
          </div>

          <div class="guest-foot font-mono">
            <span class="guest-foot-cursor caret">&gt;&gt;</span>
            <span>login</span>
            <span class="guest-foot-sep">/</span>
            <button class="guest-cta" (click)="auth.login()">authenticate</button>
            <span class="guest-foot-sep">/</span>
            <span class="guest-foot-hint">⌘L</span>
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 0 0 0.5rem;
    }

    /* ========== Status line ========== */
    .status {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border);
      border-left: 2px solid var(--primary);
      background: var(--surface-1);
      border-radius: var(--radius-sm);
      font-size: 0.6875rem;
      color: var(--foreground-muted);
      letter-spacing: 0.02em;
      align-self: flex-start;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      color: var(--foreground);
      font-weight: 500;
    }
    .status-dot {
      width: 0.4375rem;
      height: 0.4375rem;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 0 3px var(--success-soft);
      animation: pulse 2.4s var(--ease) infinite;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 3px var(--success-soft); }
      50%      { box-shadow: 0 0 0 5px transparent; }
    }
    .status-sep { color: var(--border-strong); }
    .status-item {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
    }
    .status-label {
      color: var(--foreground-subtle);
      font-size: 0.625rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .status-guest .status-label { color: var(--warning); }

    /* ========== Page head ========== */
    .head {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 56rem;
    }
    .head-title {
      display: inline-flex;
      align-items: baseline;
      gap: 0.625rem;
      font-size: clamp(1.75rem, 1.4rem + 1.5vw, 2.25rem);
      font-weight: 700;
      color: var(--foreground);
      letter-spacing: -0.03em;
      line-height: 1.05;
    }
    .head-prompt {
      color: var(--primary);
      font-size: 0.85em;
      font-weight: 600;
    }
    .head-subtitle {
      font-size: 0.9375rem;
      color: var(--foreground-muted);
      max-width: 42rem;
    }

    /* ========== Block headers ========== */
    .block-head {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      font-size: 0.6875rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--foreground-subtle);
      margin-bottom: 0.625rem;
    }
    .block-sigil { color: var(--primary); }
    .block-fill {
      flex: 1;
      height: 1px;
      background: repeating-linear-gradient(
        to right,
        var(--border) 0 4px,
        transparent 4px 8px
      );
      transform: translateY(-2px);
    }
    .block-hint { color: var(--foreground-subtle); }

    /* ========== Command suggestions ========== */
    .cmd-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      background: var(--surface-1);
    }
    .cmd-row {
      display: grid;
      grid-template-columns: 3rem 4.5rem 1fr auto auto;
      align-items: center;
      gap: 0.875rem;
      padding: 0.625rem 0.875rem;
      color: var(--foreground);
      border-bottom: 1px solid var(--border-line);
      transition: background-color 120ms var(--ease);
    }
    .cmd-row:last-child { border-bottom: none; }
    .cmd-row:hover { background: var(--surface-2); }
    .cmd-key {
      justify-self: start;
      min-width: 2.75rem;
      height: 1.375rem;
    }
    .cmd-verb {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--primary);
      letter-spacing: -0.01em;
    }
    .cmd-detail {
      font-size: 0.875rem;
      color: var(--foreground);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cmd-target {
      font-size: 0.6875rem;
      color: var(--foreground-subtle);
      letter-spacing: 0.02em;
    }
    .cmd-arrow {
      color: var(--foreground-subtle);
      transition: color 120ms var(--ease), transform 120ms var(--ease);
    }
    .cmd-row:hover .cmd-arrow {
      color: var(--primary);
      transform: translate(2px, -2px);
    }

    /* ========== Timeline ========== */
    .tl-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .tl-row {
      display: grid;
      grid-template-columns: 3.25rem 4.25rem 4rem 1fr auto auto;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      text-align: left;
      color: var(--foreground);
      cursor: pointer;
      transition: background-color 120ms var(--ease);
    }
    .tl-row:hover { background: var(--surface-2); }
    .tl-time {
      font-size: 0.6875rem;
      color: var(--foreground-subtle);
    }
    .tl-verb {
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 0.125rem 0.375rem;
      border-radius: var(--radius-sm);
      text-align: center;
    }
    .verb-created {
      background: var(--success-soft);
      color: var(--success);
    }
    .verb-updated {
      background: var(--primary-soft);
      color: var(--primary);
    }
    .tl-kind {
      font-size: 0.625rem;
      color: var(--foreground-muted);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .tl-title {
      font-size: 0.875rem;
      color: var(--foreground);
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tl-target {
      font-size: 0.6875rem;
      color: var(--foreground-subtle);
    }
    .tl-ago {
      font-size: 0.6875rem;
      color: var(--foreground-subtle);
      min-width: 4rem;
      text-align: right;
    }
    .tl-empty {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1.5rem 0.75rem;
      color: var(--foreground-subtle);
      font-size: 0.75rem;
    }
    .tl-empty-cursor {
      color: var(--primary);
      animation: caret-blink 1s steps(2, start) infinite;
    }

    /* ========== Modules table ========== */
    .mod-table {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      background: var(--surface-1);
    }
    .mod-thead, .mod-row {
      display: grid;
      grid-template-columns: 1.5fr 0.6fr 1fr 0.6fr;
      align-items: center;
      gap: 0.875rem;
      padding: 0.5rem 0.875rem;
    }
    .mod-thead {
      background: var(--surface-2);
      border-bottom: 1px solid var(--border);
      font-size: 0.625rem;
      color: var(--foreground-subtle);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .mod-thead .num { text-align: right; }
    .mod-row {
      color: var(--foreground);
      border-bottom: 1px solid var(--border-line);
      transition: background-color 120ms var(--ease);
    }
    .mod-row:last-child { border-bottom: none; }
    .mod-row:hover { background: var(--surface-2); }
    .mod-name {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: var(--foreground);
    }
    .mod-icon { color: var(--primary); }
    .mod-items {
      font-size: 0.8125rem;
      color: var(--foreground);
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .mod-last {
      font-size: 0.75rem;
      color: var(--foreground-muted);
    }
    .mod-cta {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      justify-content: flex-end;
      font-size: 0.6875rem;
      color: var(--foreground-subtle);
      transition: color 120ms var(--ease), transform 120ms var(--ease);
    }
    .mod-row:hover .mod-cta {
      color: var(--primary);
      transform: translateX(2px);
    }

    /* ========== Guest ========== */
    .guest {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
      max-width: 48rem;
    }
    .guest-lead { max-width: 44rem; }
    .guest-links {
      display: flex;
      flex-direction: column;
      gap: 0;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      background: var(--surface-1);
    }
    .guest-link {
      display: grid;
      grid-template-columns: 3rem 8rem 1fr auto;
      align-items: center;
      gap: 0.875rem;
      padding: 0.75rem 0.875rem;
      color: var(--foreground);
      border-bottom: 1px solid var(--border-line);
      transition: background-color 120ms var(--ease), color 120ms var(--ease);
    }
    .guest-link:last-child { border-bottom: none; }
    .guest-link:hover { background: var(--surface-2); }
    .guest-link-tag { color: var(--primary); font-weight: 600; }
    .guest-link-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--foreground);
    }
    .guest-link-desc {
      font-size: 0.75rem;
      color: var(--foreground-subtle);
    }
    .guest-link lucide-icon {
      color: var(--foreground-subtle);
      transition: color 120ms var(--ease), transform 120ms var(--ease);
    }
    .guest-link:hover lucide-icon {
      color: var(--primary);
      transform: translate(2px, -2px);
    }

    .guest-foot {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.875rem;
      background: var(--surface-2);
      border: 1px dashed var(--border);
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      color: var(--foreground-muted);
      align-self: flex-start;
    }
    .guest-foot-cursor { color: var(--primary); font-weight: 700; }
    .guest-foot-sep { color: var(--border-strong); }
    .guest-foot-hint { color: var(--foreground-subtle); font-size: 0.6875rem; }
    .guest-cta {
      background: transparent;
      border: none;
      color: var(--primary);
      font-family: inherit;
      font-size: inherit;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
      text-underline-offset: 3px;
      text-decoration-color: var(--primary-soft-strong);
      transition: color 120ms var(--ease), text-decoration-color 120ms var(--ease);
    }
    .guest-cta:hover {
      color: var(--primary-hover);
      text-decoration-color: var(--primary);
    }

    /* ========== Responsive ========== */
    @media (max-width: 900px) {
      .cmd-row {
        grid-template-columns: 3rem 1fr auto;
        gap: 0.625rem;
      }
      .cmd-verb { display: none; }
      .tl-row {
        grid-template-columns: 3rem 1fr auto;
        gap: 0.5rem;
      }
      .tl-verb, .tl-kind, .tl-target { display: none; }
      .mod-thead, .mod-row {
        grid-template-columns: 1.5fr 0.5fr 1fr;
      }
      .mod-thead :last-child, .mod-cta { display: none; }
      .guest-link {
        grid-template-columns: 2rem 1fr auto;
      }
      .guest-link-desc { display: none; }
    }
    @media (max-width: 540px) {
      .status { font-size: 0.625rem; gap: 0.375rem; }
      .head-title { gap: 0.4375rem; }
      .head-prompt { font-size: 0.8em; }
      .tl-row { padding: 0.5rem; }
      .mod-row, .mod-thead { padding: 0.5rem 0.625rem; }
    }
  `],
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  readonly isAuthenticated = toSignal(this.auth.isAuthenticated$, { initialValue: false });
  readonly data = signal<DashboardData | null>(null);

  readonly currentTime = signal(this.computeTime());
  private clockHandle: ReturnType<typeof setInterval> | null = null;

  readonly suggestions: readonly CmdSuggestion[] = [
    { kbd: '⌘K',  verb: 'search', detail: 'Chercher dans le coffre',     target: 'global',        path: '/search',        icon: 'search' },
    { kbd: 'g l', verb: 'goto',   detail: 'Ouvrir la Dev Library',       target: 'dev-library',   path: '/dev-library',   icon: 'code' },
    { kbd: 'g c', verb: 'goto',   detail: 'Ouvrir la Cyber Toolbox',     target: 'cyber-toolbox', path: '/cyber-toolbox', icon: 'wrench' },
    { kbd: 'g b', verb: 'goto',   detail: 'Ouvrir le Secure Bridge',     target: 'secure-bridge', path: '/secure-bridge', icon: 'send' },
    { kbd: 'g i', verb: 'goto',   detail: 'Ouvrir les IT Tools',         target: 'it-tools',      path: '/it-tools',      icon: 'hammer' },
  ];

  readonly moduleRows = computed<ModuleRow[]>(() => {
    const s = this.data()?.stats;
    const recent = this.data()?.recentActivity ?? [];
    const lastByType = (t: 'concept' | 'payload') => {
      const item = recent.find(r => r.type === t);
      return item ? this.formatTime(item.timestamp) : '—';
    };
    return [
      { id: 'dev',    path: '/dev-library',   label: 'dev-library',   items: s?.concepts ?? 0,    lastActivity: lastByType('concept'),  icon: 'code' },
      { id: 'cyber',  path: '/cyber-toolbox', label: 'cyber-toolbox', items: s?.payloads ?? 0,    lastActivity: lastByType('payload'),  icon: 'wrench' },
      { id: 'bridge', path: '/secure-bridge', label: 'secure-bridge', items: s?.secretLinks ?? 0, lastActivity: '—',                     icon: 'send' },
      { id: 'teams',  path: '/teams',         label: 'teams',         items: s?.teams ?? 0,       lastActivity: '—',                     icon: 'users' },
    ];
  });

  readonly totalItems = computed(() => {
    const s = this.data()?.stats;
    if (!s) return '0';
    return String(s.concepts + s.payloads + s.secretLinks);
  });

  readonly lastSync = computed(() => {
    const recent = this.data()?.recentActivity ?? [];
    if (recent.length === 0) return '—';
    return this.formatTime(recent[0].timestamp);
  });

  ngOnInit(): void {
    this.seo.apply({
      title: 'Tableau de bord',
      description: 'Console DevSecVault : status du coffre, raccourcis, activité récente et accès direct aux modules.',
      noindex: true,
    });
    if (this.isAuthenticated()) {
      this.loadDashboard();
    }
    const sub = this.auth.isAuthenticated$.subscribe((authed: boolean) => {
      if (authed && !this.data()) {
        this.loadDashboard();
        sub.unsubscribe();
      }
    });
    this.clockHandle = setInterval(() => this.currentTime.set(this.computeTime()), 30_000);
  }

  ngOnDestroy(): void {
    if (this.clockHandle) clearInterval(this.clockHandle);
  }

  private loadDashboard(): void {
    this.dashboardService.getDashboard().subscribe({
      next: d => this.data.set(d),
      error: () => {},
    });
  }

  navigateToItem(item: ActivityItem): void {
    if (item.type === 'concept') {
      this.router.navigate(['/dev-library'], { queryParams: { concept: item.id } });
    } else {
      this.router.navigate(['/cyber-toolbox'], { queryParams: { payload: item.id } });
    }
  }

  formatTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  formatClock(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  private computeTime(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}
