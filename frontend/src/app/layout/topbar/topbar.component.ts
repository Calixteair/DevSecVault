import { Component, Signal, inject, signal, HostListener, ElementRef, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  Search,
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
} from 'lucide-angular';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService, UserProfile } from '../../core/services/auth.service';
import { SearchService, SearchHit } from '../../core/services/search.service';
import { NotificationService } from '../../core/services/notification.service';

const icons = { Search, User, Sun, Moon, Bell, LogIn, LogOut, Shield, Crown, Code, Wrench, Hash, Star, X, Check, Trash2, Info, AlertTriangle, CheckCircle, XCircle };

@Component({
  selector: 'app-topbar',
  imports: [LucideAngularModule, AsyncPipe],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <header class="topbar">
      <div class="topbar-search" [class.search-focused]="searchFocused()">
        <lucide-icon name="search" [size]="16" [strokeWidth]="2" class="search-icon"></lucide-icon>
        <input
          #searchInput
          type="text"
          class="search-input font-mono"
          placeholder="Search snippets, tools, payloads... (Cmd+K)"
          [value]="searchQuery()"
          (input)="onSearchInput($event)"
          (focus)="searchFocused.set(true)"
          (keydown.escape)="closeSearch()"
          (keydown.arrowdown)="onArrowDown($event)"
          (keydown.arrowup)="onArrowUp($event)"
          (keydown.enter)="onEnter()"
        />
        @if (searchQuery()) {
          <button class="search-clear" (click)="clearSearch()">
            <lucide-icon name="x" [size]="14" [strokeWidth]="2"></lucide-icon>
          </button>
        }
        <kbd class="search-kbd font-mono">⌘K</kbd>

        @if (searchFocused() && (searchResults().length > 0 || searchQuery())) {
          <div class="search-dropdown">
            @if (searchResults().length === 0 && searchQuery()) {
              <div class="search-empty">No results for "{{ searchQuery() }}"</div>
            }

            @if (snippetResults().length > 0) {
              <div class="search-group">
                <div class="search-group-label font-mono">
                  <lucide-icon name="code" [size]="12" [strokeWidth]="2"></lucide-icon>
                  Concepts
                </div>
                @for (hit of snippetResults(); track hit.id; let i = $index) {
                  <button
                    class="search-result"
                    [class.result-active]="activeIndex() === getGlobalIndex('snippet', i)"
                    (click)="navigateToHit(hit)"
                    (mouseenter)="activeIndex.set(getGlobalIndex('snippet', i))"
                  >
                    <span class="result-title">{{ hit.title }}</span>
                    @if (hit.language) {
                      <span class="result-badge font-mono">{{ hit.language }}</span>
                    }
                  </button>
                }
              </div>
            }

            @if (payloadResults().length > 0) {
              <div class="search-group">
                <div class="search-group-label font-mono">
                  <lucide-icon name="wrench" [size]="12" [strokeWidth]="2"></lucide-icon>
                  Payloads
                </div>
                @for (hit of payloadResults(); track hit.id; let i = $index) {
                  <button
                    class="search-result"
                    [class.result-active]="activeIndex() === getGlobalIndex('payload', i)"
                    (click)="navigateToHit(hit)"
                    (mouseenter)="activeIndex.set(getGlobalIndex('payload', i))"
                  >
                    <span class="result-title">{{ hit.title }}</span>
                    @if (hit.category) {
                      <span class="result-badge font-mono">{{ hit.category }}</span>
                    }
                  </button>
                }
              </div>
            }

            @if (tagResults().length > 0) {
              <div class="search-group">
                <div class="search-group-label font-mono">
                  <lucide-icon name="hash" [size]="12" [strokeWidth]="2"></lucide-icon>
                  Tags
                </div>
                @for (hit of tagResults(); track hit.id; let i = $index) {
                  <button
                    class="search-result"
                    [class.result-active]="activeIndex() === getGlobalIndex('tag', i)"
                    (click)="navigateToHit(hit)"
                    (mouseenter)="activeIndex.set(getGlobalIndex('tag', i))"
                  >
                    <span class="result-title">
                      @if (hit.isOfficial) {
                        <lucide-icon name="star" [size]="12" [strokeWidth]="2" class="tag-official"></lucide-icon>
                      }
                      #{{ hit.title }}
                    </span>
                  </button>
                }
              </div>
            }
          </div>
        }
      </div>

      <div class="topbar-actions">
        @if (auth.isAuthenticated$ | async) {
          @let user = userData();
          @if (user !== null) {
            <div class="user-badge">
              @if (user.roles.includes('ROLE_ADMIN')) {
                <lucide-icon name="shield" [size]="16" [strokeWidth]="2" class="role-icon role-admin"></lucide-icon>
              } @else if (user.roles.includes('ROLE_TEAM_LEAD')) {
                <lucide-icon name="crown" [size]="16" [strokeWidth]="2" class="role-icon role-lead"></lucide-icon>
              } @else {
                <lucide-icon name="user" [size]="16" [strokeWidth]="2"></lucide-icon>
              }
              <span class="user-name">{{ user.username }}</span>
              <span class="user-role">
                @if (user.roles.includes('ROLE_ADMIN')) {
                  (Admin)
                } @else if (user.roles.includes('ROLE_TEAM_LEAD')) {
                  (Team Lead)
                } @else {
                  (User)
                }
              </span>
            </div>
            <button class="icon-btn" (click)="auth.logout()" title="Logout">
              <lucide-icon name="log-out" [size]="18" [strokeWidth]="2"></lucide-icon>
            </button>
          }
        } @else {
          <div class="user-badge">
            <lucide-icon name="user" [size]="16" [strokeWidth]="2"></lucide-icon>
            <span class="user-name">Guest</span>
          </div>
          <button class="login-btn" (click)="auth.login()">
            <lucide-icon name="log-in" [size]="16" [strokeWidth]="2"></lucide-icon>
            <span>Login</span>
          </button>
        }

        <button class="icon-btn" (click)="themeService.toggle()" title="Toggle theme">
          @if (themeService.isDark()) {
            <lucide-icon name="sun" [size]="18" [strokeWidth]="2"></lucide-icon>
          } @else {
            <lucide-icon name="moon" [size]="18" [strokeWidth]="2"></lucide-icon>
          }
        </button>

        <div class="notification-wrapper">
          <button class="icon-btn notification-btn" title="Notifications" (click)="toggleNotifications()">
            <lucide-icon name="bell" [size]="18" [strokeWidth]="2"></lucide-icon>
            @if (notifService.hasUnread()) {
              <span class="notification-dot"></span>
            }
          </button>

          @if (showNotifications()) {
            <div class="notif-dropdown">
              <div class="notif-header">
                <span class="notif-title font-mono">Notifications</span>
                <div class="notif-actions">
                  @if (notifService.hasUnread()) {
                    <button class="notif-action-btn" title="Mark all as read" (click)="notifService.markAllAsRead()">
                      <lucide-icon name="check" [size]="14" [strokeWidth]="2"></lucide-icon>
                    </button>
                  }
                  @if (notifService.notifications().length > 0) {
                    <button class="notif-action-btn" title="Clear all" (click)="notifService.clearAll()">
                      <lucide-icon name="trash-2" [size]="14" [strokeWidth]="2"></lucide-icon>
                    </button>
                  }
                </div>
              </div>
              <div class="notif-list">
                @for (notif of notifService.notifications(); track notif.id) {
                  <div class="notif-item" [class.notif-unread]="!notif.read" (click)="notifService.markAsRead(notif.id)">
                    <div class="notif-icon-wrap" [class]="'notif-type-' + notif.type">
                      @switch (notif.type) {
                        @case ('success') { <lucide-icon name="check-circle" [size]="14" [strokeWidth]="2"></lucide-icon> }
                        @case ('warning') { <lucide-icon name="alert-triangle" [size]="14" [strokeWidth]="2"></lucide-icon> }
                        @case ('error') { <lucide-icon name="x-circle" [size]="14" [strokeWidth]="2"></lucide-icon> }
                        @default { <lucide-icon name="info" [size]="14" [strokeWidth]="2"></lucide-icon> }
                      }
                    </div>
                    <div class="notif-content">
                      <span class="notif-item-title">{{ notif.title }}</span>
                      <span class="notif-item-msg">{{ notif.message }}</span>
                    </div>
                    <button class="notif-dismiss" (click)="$event.stopPropagation(); notifService.dismiss(notif.id)">
                      <lucide-icon name="x" [size]="12" [strokeWidth]="2"></lucide-icon>
                    </button>
                  </div>
                } @empty {
                  <div class="notif-empty">No notifications</div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      height: 4rem;
      min-height: 4rem;
      background: var(--card);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      gap: 1rem;
    }
    .topbar-search {
      display: flex;
      align-items: center;
      flex: 1;
      max-width: 36rem;
      position: relative;
    }
    .search-icon {
      position: absolute;
      left: 0.75rem;
      color: var(--muted-foreground);
      pointer-events: none;
      z-index: 1;
    }
    .search-input {
      width: 100%;
      height: 2.25rem;
      padding: 0 4rem 0 2.25rem;
      background: var(--input-background);
      border: 1px solid var(--input);
      border-radius: var(--radius);
      color: var(--foreground);
      font-size: 0.8125rem;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .search-input::placeholder {
      color: var(--muted-foreground);
    }
    .search-focused .search-input,
    .search-input:focus {
      border-color: var(--ring);
    }
    .search-kbd {
      position: absolute;
      right: 0.5rem;
      font-size: 0.625rem;
      padding: 0.125rem 0.375rem;
      background: var(--secondary);
      border: 1px solid var(--border);
      border-radius: 0.25rem;
      color: var(--muted-foreground);
      pointer-events: none;
    }
    .search-clear {
      position: absolute;
      right: 2.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
      border: none;
      background: var(--secondary);
      color: var(--muted-foreground);
      border-radius: 50%;
      cursor: pointer;
    }
    .search-clear:hover { color: var(--foreground); }

    /* Dropdown */
    .search-dropdown {
      position: absolute;
      top: calc(100% + 0.375rem);
      left: 0;
      right: 0;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      z-index: 100;
      max-height: 24rem;
      overflow-y: auto;
      padding: 0.375rem;
    }
    .search-empty {
      padding: 1rem;
      text-align: center;
      font-size: 0.8125rem;
      color: var(--muted-foreground);
    }
    .search-group { margin-bottom: 0.25rem; }
    .search-group-label {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--muted-foreground);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.375rem 0.5rem;
    }
    .search-result {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0.5rem 0.625rem;
      border: none;
      background: transparent;
      color: var(--foreground);
      font-family: inherit;
      font-size: 0.8125rem;
      text-align: left;
      cursor: pointer;
      border-radius: calc(var(--radius) - 2px);
      transition: background-color 0.1s ease;
    }
    .search-result:hover,
    .search-result.result-active {
      background: var(--secondary);
    }
    .result-title {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .result-badge {
      font-size: 0.6875rem;
      padding: 0.0625rem 0.375rem;
      border-radius: 0.25rem;
      background: var(--secondary);
      color: var(--muted-foreground);
      flex-shrink: 0;
    }
    .tag-official { color: var(--accent); }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .user-badge {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      color: var(--foreground);
      font-size: 0.8125rem;
    }
    .user-role {
      color: var(--muted-foreground);
      font-size: 0.75rem;
    }
    .role-icon.role-admin { color: var(--destructive); }
    .role-icon.role-lead { color: var(--accent); }
    .login-btn {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      height: 2.25rem;
      padding: 0 0.75rem;
      border-radius: var(--radius);
      border: none;
      background: var(--primary);
      color: var(--primary-foreground);
      font-family: inherit;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.15s ease;
    }
    .login-btn:hover { opacity: 0.9; }
    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: var(--radius);
      border: none;
      background: transparent;
      color: var(--muted-foreground);
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease;
    }
    .icon-btn:hover {
      background: var(--secondary);
      color: var(--foreground);
    }
    .notification-wrapper { position: relative; }
    .notification-btn { position: relative; }
    .notification-dot {
      position: absolute;
      top: 0.375rem;
      right: 0.375rem;
      width: 0.5rem;
      height: 0.5rem;
      background: var(--destructive);
      border-radius: 50%;
      border: 2px solid var(--card);
    }

    /* Notification dropdown */
    .notif-dropdown {
      position: absolute;
      top: calc(100% + 0.375rem);
      right: 0;
      width: 20rem;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      z-index: 100;
      overflow: hidden;
    }
    .notif-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.625rem 0.75rem;
      border-bottom: 1px solid var(--border);
    }
    .notif-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--foreground);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .notif-actions { display: flex; gap: 0.25rem; }
    .notif-action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      border: none;
      background: transparent;
      color: var(--muted-foreground);
      cursor: pointer;
      border-radius: 0.25rem;
    }
    .notif-action-btn:hover { background: var(--secondary); color: var(--foreground); }
    .notif-list {
      max-height: 20rem;
      overflow-y: auto;
    }
    .notif-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      cursor: pointer;
      transition: background-color 0.1s ease;
      border-bottom: 1px solid var(--border);
    }
    .notif-item:last-child { border-bottom: none; }
    .notif-item:hover { background: var(--secondary); }
    .notif-unread { background: color-mix(in srgb, var(--primary) 5%, transparent); }
    .notif-icon-wrap {
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 0.0625rem;
    }
    .notif-type-info { color: var(--primary); }
    .notif-type-success { color: var(--primary); }
    .notif-type-warning { color: var(--accent); }
    .notif-type-error { color: var(--destructive); }
    .notif-content { flex: 1; min-width: 0; }
    .notif-item-title {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--foreground);
    }
    .notif-item-msg {
      display: block;
      font-size: 0.6875rem;
      color: var(--muted-foreground);
      margin-top: 0.0625rem;
    }
    .notif-dismiss {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
      border: none;
      background: transparent;
      color: var(--muted-foreground);
      cursor: pointer;
      border-radius: 0.25rem;
      flex-shrink: 0;
      opacity: 0;
      transition: opacity 0.1s ease;
    }
    .notif-item:hover .notif-dismiss { opacity: 1; }
    .notif-dismiss:hover { color: var(--destructive); }
    .notif-empty {
      padding: 1.5rem;
      text-align: center;
      font-size: 0.8125rem;
      color: var(--muted-foreground);
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

  // Cmd+K / Ctrl+K global shortcut
  @HostListener('document:keydown', ['$event'])
  onGlobalKey(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const input = this.el.nativeElement.querySelector('.search-input') as HTMLInputElement | null;
      input?.focus();
      input?.select();
    }
    // Close on Escape when clicking outside
    if (e.key === 'Escape' && this.searchFocused()) {
      this.closeSearch();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const target = e.target as Node;
    if (this.searchFocused() && !this.el.nativeElement.querySelector('.topbar-search')?.contains(target)) {
      this.searchFocused.set(false);
    }
    if (this.showNotifications() && !this.el.nativeElement.querySelector('.notification-wrapper')?.contains(target)) {
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
    const input = this.el.nativeElement.querySelector('.search-input') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  closeSearch(): void {
    this.searchFocused.set(false);
    this.clearSearch();
    (document.activeElement as HTMLElement)?.blur();
  }

  // Keyboard navigation in dropdown
  snippetResults(): SearchHit[] { return this.searchResults().filter(h => h.type === 'snippet'); }
  payloadResults(): SearchHit[] { return this.searchResults().filter(h => h.type === 'payload'); }
  tagResults(): SearchHit[] { return this.searchResults().filter(h => h.type === 'tag'); }

  private flatResults(): SearchHit[] {
    return [...this.snippetResults(), ...this.payloadResults(), ...this.tagResults()];
  }

  getGlobalIndex(type: string, localIndex: number): number {
    const snippets = this.snippetResults();
    const payloads = this.payloadResults();
    if (type === 'snippet') return localIndex;
    if (type === 'payload') return snippets.length + localIndex;
    return snippets.length + payloads.length + localIndex;
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
    }
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
      case 'tag':
        // Navigate to dev-library for now — tags are cross-cutting
        this.router.navigate(['/dev-library']);
        break;
    }
  }
}
