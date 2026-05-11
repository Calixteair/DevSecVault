import { Component, Signal, inject, signal, HostListener, ElementRef, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  User,
  Sun,
  Moon,
  Bell,
  LogIn,
  LogOut,
  Shield,
  Crown,
  Code,
  Wrench,
  Hash,
  Star,
  X,
  Check,
  Trash2,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  CornerDownLeft,
} from 'lucide-angular';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService, UserProfile } from '../../core/services/auth.service';
import { SearchService, SearchHit } from '../../core/services/search.service';
import { NotificationService } from '../../core/services/notification.service';

const icons = { User, Sun, Moon, Bell, LogIn, LogOut, Shield, Crown, Code, Wrench, Hash, Star, X, Check, Trash2, Info, AlertTriangle, CheckCircle, XCircle, CornerDownLeft };

@Component({
  selector: 'app-topbar',
  imports: [LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <header class="topbar">
      <!-- =========== Command bar (centre) =========== -->
      <div class="cmd" [class.cmd-focused]="searchFocused()">
        <span class="cmd-prompt font-mono" aria-hidden="true">&gt;&gt;</span>
        <input
          #searchInput
          type="text"
          class="cmd-input font-mono"
          placeholder="type a command, or search snippets, payloads, tools"
          [value]="searchQuery()"
          (input)="onSearchInput($event)"
          (focus)="searchFocused.set(true)"
          (keydown.escape)="closeSearch()"
          (keydown.arrowdown)="onArrowDown($event)"
          (keydown.arrowup)="onArrowUp($event)"
          (keydown.enter)="onEnter()"
          autocomplete="off"
          spellcheck="false"
        />
        @if (searchQuery()) {
          <button class="cmd-clear" (click)="clearSearch()" aria-label="Clear">
            <lucide-icon name="x" [size]="13" [strokeWidth]="2"></lucide-icon>
          </button>
        }
        <kbd class="cmd-kbd">⌘K</kbd>

        @if (searchFocused() && (searchResults().length > 0 || searchQuery())) {
          <div class="palette">
            @if (searchResults().length === 0 && searchQuery()) {
              <div class="palette-empty font-mono">
                <span class="palette-arrow">→</span>
                <span>no match for</span>
                <span class="palette-query">"{{ searchQuery() }}"</span>
              </div>
            }

            @if (snippetResults().length > 0) {
              <div class="palette-group">
                <div class="palette-group-label font-mono">
                  <span class="palette-group-sigil">[01]</span>
                  <span>snippets</span>
                  <span class="palette-group-count">· {{ snippetResults().length }}</span>
                </div>
                @for (hit of snippetResults(); track hit.id; let i = $index) {
                  <button
                    class="palette-row"
                    [class.row-active]="activeIndex() === getGlobalIndex('snippet', i)"
                    (click)="navigateToHit(hit)"
                    (mouseenter)="activeIndex.set(getGlobalIndex('snippet', i))"
                  >
                    <span class="row-sigil font-mono">snippet</span>
                    <span class="row-title">{{ hit.title }}</span>
                    @if (hit.language) {
                      <span class="row-badge font-mono">{{ hit.language }}</span>
                    }
                  </button>
                }
              </div>
            }

            @if (payloadResults().length > 0) {
              <div class="palette-group">
                <div class="palette-group-label font-mono">
                  <span class="palette-group-sigil">[02]</span>
                  <span>payloads</span>
                  <span class="palette-group-count">· {{ payloadResults().length }}</span>
                </div>
                @for (hit of payloadResults(); track hit.id; let i = $index) {
                  <button
                    class="palette-row"
                    [class.row-active]="activeIndex() === getGlobalIndex('payload', i)"
                    (click)="navigateToHit(hit)"
                    (mouseenter)="activeIndex.set(getGlobalIndex('payload', i))"
                  >
                    <span class="row-sigil font-mono">payload</span>
                    <span class="row-title">{{ hit.title }}</span>
                    @if (hit.category) {
                      <span class="row-badge font-mono">{{ hit.category }}</span>
                    }
                  </button>
                }
              </div>
            }

            @if (toolResults().length > 0) {
              <div class="palette-group">
                <div class="palette-group-label font-mono">
                  <span class="palette-group-sigil">[03]</span>
                  <span>it-tools</span>
                  <span class="palette-group-count">· {{ toolResults().length }}</span>
                </div>
                @for (hit of toolResults(); track hit.id; let i = $index) {
                  <button
                    class="palette-row"
                    [class.row-active]="activeIndex() === getGlobalIndex('tool', i)"
                    (click)="navigateToHit(hit)"
                    (mouseenter)="activeIndex.set(getGlobalIndex('tool', i))"
                  >
                    <span class="row-sigil font-mono">tool</span>
                    <span class="row-title">{{ hit.title }}</span>
                    @if (hit.category) {
                      <span class="row-badge font-mono">{{ hit.category }}</span>
                    }
                  </button>
                }
              </div>
            }

            @if (tagResults().length > 0) {
              <div class="palette-group">
                <div class="palette-group-label font-mono">
                  <span class="palette-group-sigil">[04]</span>
                  <span>tags</span>
                  <span class="palette-group-count">· {{ tagResults().length }}</span>
                </div>
                @for (hit of tagResults(); track hit.id; let i = $index) {
                  <button
                    class="palette-row"
                    [class.row-active]="activeIndex() === getGlobalIndex('tag', i)"
                    (click)="navigateToHit(hit)"
                    (mouseenter)="activeIndex.set(getGlobalIndex('tag', i))"
                  >
                    <span class="row-sigil font-mono">tag</span>
                    <span class="row-title">
                      @if (hit.isOfficial) {
                        <span class="row-official" title="Official">★</span>
                      }
                      <span class="font-mono">#{{ hit.title }}</span>
                    </span>
                  </button>
                }
              </div>
            }

            <footer class="palette-foot font-mono">
              <span class="palette-hint">
                <kbd>↑↓</kbd><span>navigate</span>
                <kbd>↵</kbd><span>open</span>
                <kbd>esc</kbd><span>close</span>
              </span>
              @if (searchResults().length > 0 && searchQuery()) {
                <button class="palette-see-all" (click)="goToFullSearch()">
                  see all results
                  <lucide-icon name="corner-down-left" [size]="11" [strokeWidth]="2"></lucide-icon>
                </button>
              }
            </footer>
          </div>
        }
      </div>

      <!-- =========== Toolbar (droite) =========== -->
      <div class="tools">
        <button class="tool-btn" (click)="themeService.toggle()" [title]="themeService.isDark() ? 'Light mode' : 'Dark mode'">
          @if (themeService.isDark()) {
            <lucide-icon name="sun" [size]="15" [strokeWidth]="1.75"></lucide-icon>
          } @else {
            <lucide-icon name="moon" [size]="15" [strokeWidth]="1.75"></lucide-icon>
          }
        </button>

        <div class="notif-wrap">
          <button class="tool-btn" title="Notifications" (click)="toggleNotifications()">
            <lucide-icon name="bell" [size]="15" [strokeWidth]="1.75"></lucide-icon>
            @if (notifService.hasUnread()) {
              <span class="tool-dot"></span>
            }
          </button>

          @if (showNotifications()) {
            <div class="notif-pop">
              <div class="notif-head font-mono">
                <span>notifications</span>
                <div class="notif-actions">
                  @if (notifService.hasUnread()) {
                    <button class="notif-act" title="Mark all read" (click)="notifService.markAllAsRead()">
                      <lucide-icon name="check" [size]="12" [strokeWidth]="2"></lucide-icon>
                    </button>
                  }
                  @if (notifService.notifications().length > 0) {
                    <button class="notif-act" title="Clear all" (click)="notifService.clearAll()">
                      <lucide-icon name="trash-2" [size]="12" [strokeWidth]="2"></lucide-icon>
                    </button>
                  }
                </div>
              </div>
              <div class="notif-body">
                @for (notif of notifService.notifications(); track notif.id) {
                  <div class="notif-row" [class.notif-unread]="!notif.read" (click)="notifService.markAsRead(notif.id)">
                    <span class="notif-sigil font-mono" [class]="'notif-' + notif.type">
                      @switch (notif.type) {
                        @case ('success') { ok }
                        @case ('warning') { ! }
                        @case ('error') { x }
                        @default { i }
                      }
                    </span>
                    <div class="notif-msg">
                      <span class="notif-title">{{ notif.title }}</span>
                      <span class="notif-text">{{ notif.message }}</span>
                    </div>
                    <button class="notif-x" (click)="$event.stopPropagation(); notifService.dismiss(notif.id)" aria-label="Dismiss">
                      <lucide-icon name="x" [size]="11" [strokeWidth]="2"></lucide-icon>
                    </button>
                  </div>
                } @empty {
                  <div class="notif-empty font-mono">no notifications</div>
                }
              </div>
            </div>
          }
        </div>

        @if (isAuthenticated()) {
          @let user = userData();
          @if (user !== null) {
            <button class="tool-btn" (click)="auth.logout()" title="Logout">
              <lucide-icon name="log-out" [size]="15" [strokeWidth]="1.75"></lucide-icon>
            </button>
            <div class="avatar font-mono" [title]="user.username">
              @if (user.roles.includes('ROLE_ADMIN')) {
                <lucide-icon name="shield" [size]="13" [strokeWidth]="2" class="avatar-role role-admin"></lucide-icon>
              } @else if (user.roles.includes('ROLE_TEAM_LEAD')) {
                <lucide-icon name="crown" [size]="13" [strokeWidth]="2" class="avatar-role role-lead"></lucide-icon>
              } @else {
                <span class="avatar-initials">{{ initials(user.username) }}</span>
              }
            </div>
          }
        } @else {
          <button class="login-pill font-mono" (click)="auth.login()">
            login
            <kbd>⌘L</kbd>
          </button>
        }
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      height: 3rem;
      min-height: 3rem;
      background: color-mix(in srgb, var(--surface-1) 86%, transparent);
      -webkit-backdrop-filter: blur(14px) saturate(120%);
      backdrop-filter: blur(14px) saturate(120%);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 0.875rem;
      gap: 0.875rem;
      position: relative;
      z-index: 20;
    }

    /* =========== Command bar =========== */
    .cmd {
      flex: 1;
      max-width: 40rem;
      position: relative;
      display: flex;
      align-items: center;
      height: 2rem;
      padding: 0 0.625rem 0 0.625rem;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      transition: border-color 180ms var(--ease), background-color 180ms var(--ease), box-shadow 180ms var(--ease);
    }
    .cmd:hover { border-color: var(--border-strong); }
    .cmd-focused {
      background: var(--input-background);
      border-color: var(--primary);
      box-shadow: var(--shadow-glow);
    }
    .cmd-prompt {
      color: var(--primary);
      font-size: 0.8125rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-right: 0.5rem;
      flex-shrink: 0;
    }
    .cmd-input {
      flex: 1;
      height: 100%;
      background: transparent;
      border: none;
      outline: none;
      color: var(--foreground);
      font-size: 0.8125rem;
      letter-spacing: -0.005em;
    }
    .cmd-input::placeholder { color: var(--foreground-subtle); }
    .cmd-clear {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.125rem;
      height: 1.125rem;
      margin-left: 0.25rem;
      border: none;
      background: var(--surface-3);
      color: var(--foreground-muted);
      border-radius: 50%;
      cursor: pointer;
      transition: background-color 120ms var(--ease), color 120ms var(--ease);
    }
    .cmd-clear:hover { background: var(--border-strong); color: var(--foreground); }
    .cmd-kbd {
      margin-left: 0.5rem;
      flex-shrink: 0;
    }

    /* =========== Palette dropdown =========== */
    .palette {
      position: absolute;
      top: calc(100% + 0.5rem);
      left: 0;
      right: 0;
      background: var(--popover);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      z-index: 100;
      max-height: 26rem;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .palette-empty {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      font-size: 0.75rem;
      color: var(--foreground-subtle);
    }
    .palette-arrow { color: var(--primary); }
    .palette-query { color: var(--foreground); }

    .palette-group {
      padding: 0.25rem 0.25rem;
    }
    .palette-group-label {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.625rem 0.375rem;
      font-size: 0.625rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--foreground-subtle);
    }
    .palette-group-sigil { color: var(--primary); }
    .palette-group-count { color: var(--foreground-subtle); }

    .palette-row {
      display: grid;
      grid-template-columns: 4.25rem 1fr auto;
      align-items: center;
      gap: 0.625rem;
      width: 100%;
      padding: 0.4375rem 0.625rem;
      border: none;
      background: transparent;
      color: var(--foreground);
      font-family: inherit;
      font-size: 0.8125rem;
      text-align: left;
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition: background-color 100ms var(--ease);
    }
    .palette-row:hover, .palette-row.row-active {
      background: var(--surface-2);
    }
    .palette-row.row-active { color: var(--foreground); }

    .row-sigil {
      font-size: 0.625rem;
      color: var(--foreground-subtle);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 0.125rem 0.375rem;
      background: var(--surface-2);
      border-radius: var(--radius-sm);
      text-align: center;
    }
    .row-active .row-sigil {
      background: var(--primary-soft);
      color: var(--primary);
    }
    .row-title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
    }
    .row-badge {
      font-size: 0.625rem;
      padding: 0.125rem 0.375rem;
      border-radius: var(--radius-sm);
      background: var(--surface-2);
      color: var(--foreground-muted);
      letter-spacing: 0.02em;
    }
    .row-official { color: var(--primary); font-size: 0.75rem; }

    .palette-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.5rem 0.625rem;
      border-top: 1px solid var(--border);
      background: var(--surface-2);
      font-size: 0.6875rem;
      color: var(--foreground-subtle);
    }
    .palette-hint {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
    }
    .palette-hint kbd {
      margin-right: 0.125rem;
    }
    .palette-see-all {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--primary);
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      cursor: pointer;
      transition: background-color 120ms var(--ease), border-color 120ms var(--ease);
    }
    .palette-see-all:hover {
      background: var(--primary-soft);
      border-color: var(--primary-soft-strong);
    }

    /* =========== Right toolbar =========== */
    .tools {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .tool-btn {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border-radius: var(--radius);
      border: none;
      background: transparent;
      color: var(--foreground-subtle);
      cursor: pointer;
      transition: background-color 120ms var(--ease), color 120ms var(--ease);
    }
    .tool-btn:hover { background: var(--surface-2); color: var(--foreground); }
    .tool-dot {
      position: absolute;
      top: 0.4375rem;
      right: 0.4375rem;
      width: 0.4375rem;
      height: 0.4375rem;
      background: var(--primary);
      border-radius: 50%;
      box-shadow: 0 0 0 2px var(--surface-1);
    }

    .avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      margin-left: 0.25rem;
      background: var(--primary-soft-strong);
      color: var(--primary);
      border-radius: var(--radius-sm);
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .avatar-role { color: var(--primary); }
    .role-admin { color: var(--destructive); }
    .role-lead { color: var(--primary); }

    .login-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      height: 1.875rem;
      padding: 0 0.625rem;
      background: var(--primary);
      color: var(--primary-foreground);
      border: none;
      border-radius: var(--radius);
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 120ms var(--ease), box-shadow 120ms var(--ease);
    }
    .login-pill kbd {
      background: rgba(255,255,255,0.15);
      border-color: transparent;
      color: inherit;
    }
    .login-pill:hover {
      background: var(--primary-hover);
    }

    /* =========== Notif pop =========== */
    .notif-wrap { position: relative; }
    .notif-pop {
      position: absolute;
      top: calc(100% + 0.5rem);
      right: 0;
      width: 20rem;
      background: var(--popover);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      z-index: 100;
      overflow: hidden;
    }
    .notif-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.625rem;
      background: var(--surface-2);
      border-bottom: 1px solid var(--border);
      font-size: 0.625rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--foreground-subtle);
    }
    .notif-actions { display: flex; gap: 0.125rem; }
    .notif-act {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.375rem;
      height: 1.375rem;
      border: none;
      background: transparent;
      color: var(--foreground-subtle);
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition: background-color 120ms var(--ease), color 120ms var(--ease);
    }
    .notif-act:hover { background: var(--surface-3); color: var(--foreground); }

    .notif-body { max-height: 18rem; overflow-y: auto; }
    .notif-row {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: start;
      gap: 0.5rem;
      padding: 0.5rem 0.625rem;
      cursor: pointer;
      border-bottom: 1px solid var(--border-line);
      transition: background-color 100ms var(--ease);
    }
    .notif-row:last-child { border-bottom: none; }
    .notif-row:hover { background: var(--surface-2); }
    .notif-unread { background: color-mix(in srgb, var(--primary) 6%, transparent); }
    .notif-sigil {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.375rem;
      height: 1.375rem;
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0;
      border-radius: var(--radius-sm);
      text-transform: lowercase;
    }
    .notif-info { background: var(--primary-soft); color: var(--primary); }
    .notif-success { background: var(--success-soft); color: var(--success); }
    .notif-warning { background: var(--warning-soft); color: var(--warning); }
    .notif-error { background: var(--destructive-soft); color: var(--destructive); }

    .notif-msg { display: flex; flex-direction: column; min-width: 0; gap: 0.0625rem; }
    .notif-title { font-size: 0.75rem; font-weight: 600; color: var(--foreground); }
    .notif-text { font-size: 0.6875rem; color: var(--foreground-muted); line-height: 1.4; }
    .notif-x {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.125rem;
      height: 1.125rem;
      border: none;
      background: transparent;
      color: var(--foreground-subtle);
      cursor: pointer;
      border-radius: var(--radius-sm);
      opacity: 0;
      transition: opacity 100ms var(--ease), color 120ms var(--ease);
    }
    .notif-row:hover .notif-x { opacity: 1; }
    .notif-x:hover { color: var(--destructive); }
    .notif-empty {
      padding: 1.5rem;
      text-align: center;
      font-size: 0.75rem;
      color: var(--foreground-subtle);
      letter-spacing: 0.04em;
    }

    /* =========== Responsive =========== */
    @media (max-width: 768px) {
      .topbar {
        height: 2.75rem;
        min-height: 2.75rem;
        padding: 0 0.625rem;
        gap: 0.5rem;
      }
      .cmd { max-width: none; height: 1.875rem; padding: 0 0.5rem; }
      .cmd-prompt { font-size: 0.75rem; }
      .cmd-input { font-size: 0.75rem; }
      .cmd-kbd { display: none; }
      .tool-btn { width: 1.875rem; height: 1.875rem; }
      .avatar { width: 1.625rem; height: 1.625rem; margin-left: 0.125rem; }
      .login-pill { height: 1.75rem; padding: 0 0.5rem; font-size: 0.6875rem; }
      .notif-pop {
        position: fixed;
        top: 3rem;
        left: 0.5rem;
        right: 0.5rem;
        width: auto;
      }
      .palette {
        position: fixed;
        top: 3rem;
        left: 0.5rem;
        right: 0.5rem;
        max-height: 60vh;
      }
    }
  `],
})
export class TopbarComponent implements OnDestroy {
  readonly themeService = inject(ThemeService);
  readonly auth = inject(AuthService);
  readonly notifService = inject(NotificationService);
  private readonly searchService = inject(SearchService);
  private readonly router = inject(Router);
  private readonly el = inject(ElementRef);

  readonly userData: Signal<UserProfile | null> = toSignal(this.auth.userData$, { initialValue: null });
  readonly isAuthenticated: Signal<boolean> = toSignal(this.auth.isAuthenticated$, { initialValue: false });

  readonly searchQuery = signal('');
  readonly searchFocused = signal(false);
  readonly searchResults = signal<SearchHit[]>([]);
  readonly activeIndex = signal(-1);
  readonly showNotifications = signal(false);

  private readonly search$ = new Subject<string>();
  private readonly searchSub: Subscription;

  constructor() {
    this.searchSub = this.search$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap(q => q.trim() ? this.searchService.search(q) : of([])),
    ).subscribe(hits => {
      this.searchResults.set(hits);
      this.activeIndex.set(-1);
    });
  }

  ngOnDestroy(): void {
    this.searchSub.unsubscribe();
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKey(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const input = this.el.nativeElement.querySelector('.cmd-input') as HTMLInputElement | null;
      input?.focus();
      input?.select();
    }
    if (e.key === 'Escape' && this.searchFocused()) {
      this.closeSearch();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const target = e.target as Node;
    if (this.searchFocused() && !this.el.nativeElement.querySelector('.cmd')?.contains(target)) {
      this.searchFocused.set(false);
    }
    if (this.showNotifications() && !this.el.nativeElement.querySelector('.notif-wrap')?.contains(target)) {
      this.showNotifications.set(false);
    }
  }

  toggleNotifications(): void {
    this.showNotifications.update(v => !v);
  }

  onSearchInput(e: Event): void {
    const val = (e.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    this.search$.next(val);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.activeIndex.set(-1);
    const input = this.el.nativeElement.querySelector('.cmd-input') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  closeSearch(): void {
    this.searchFocused.set(false);
    this.clearSearch();
    (document.activeElement as HTMLElement)?.blur();
  }

  snippetResults(): SearchHit[] { return this.searchResults().filter(h => h.type === 'snippet'); }
  payloadResults(): SearchHit[] { return this.searchResults().filter(h => h.type === 'payload'); }
  toolResults(): SearchHit[] { return this.searchResults().filter(h => h.type === 'tool'); }
  tagResults(): SearchHit[] { return this.searchResults().filter(h => h.type === 'tag'); }

  private flatResults(): SearchHit[] {
    return [...this.snippetResults(), ...this.payloadResults(), ...this.toolResults(), ...this.tagResults()];
  }

  getGlobalIndex(type: string, localIndex: number): number {
    const s = this.snippetResults().length;
    const p = this.payloadResults().length;
    const t = this.toolResults().length;
    if (type === 'snippet') return localIndex;
    if (type === 'payload') return s + localIndex;
    if (type === 'tool') return s + p + localIndex;
    return s + p + t + localIndex;
  }

  onArrowDown(e: Event): void {
    e.preventDefault();
    const max = this.flatResults().length - 1;
    this.activeIndex.set(Math.min(this.activeIndex() + 1, max));
  }

  onArrowUp(e: Event): void {
    e.preventDefault();
    this.activeIndex.set(Math.max(this.activeIndex() - 1, 0));
  }

  onEnter(): void {
    const flat = this.flatResults();
    const idx = this.activeIndex();
    if (idx >= 0 && idx < flat.length) {
      this.navigateToHit(flat[idx]);
      return;
    }
    this.goToFullSearch();
  }

  goToFullSearch(): void {
    const q = this.searchQuery().trim();
    if (!q) return;
    this.closeSearch();
    this.router.navigate(['/search'], { queryParams: { q } });
  }

  navigateToHit(hit: SearchHit): void {
    this.closeSearch();
    switch (hit.type) {
      case 'snippet':
        this.router.navigate(['/dev-library'], { queryParams: { concept: hit.id } });
        break;
      case 'payload':
        this.router.navigate(['/cyber-toolbox'], { queryParams: { payload: hit.id } });
        break;
      case 'tool':
        this.router.navigate(['/it-tools', hit.id]);
        break;
      case 'tag':
        this.router.navigate(['/search'], { queryParams: { tag: hit.title } });
        break;
    }
  }

  initials(name: string | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 0) return name.slice(0, 2).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
}
