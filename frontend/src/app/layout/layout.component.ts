import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { FooterComponent } from './footer/footer.component';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, FooterComponent],
  template: `
    <div class="layout">
      <app-sidebar />
      <div class="layout-main">
        <app-topbar />
        <main class="layout-content">
          <div class="layout-gutter" aria-hidden="true">
            @for (n of lineNumbers; track n) {
              <span class="layout-gutter-line font-mono">{{ n }}</span>
            }
          </div>
          <div class="layout-inner">
            <router-outlet />
          </div>
          <app-footer />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      height: 100dvh;
      background: var(--background);
      color: var(--foreground);
    }
    .layout-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }
    .layout-content {
      position: relative;
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    /* IDE-style gutter on the left of the content area */
    .layout-gutter {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 2.25rem;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      padding-top: 1rem;
      gap: 1.125rem;
      align-items: flex-end;
      padding-right: 0.5rem;
      color: var(--foreground-subtle);
      opacity: 0.35;
      user-select: none;
      z-index: 0;
      border-right: 1px solid var(--border-line);
    }
    .layout-gutter-line {
      font-size: 0.625rem;
      letter-spacing: 0.02em;
      line-height: 1;
    }

    .layout-inner {
      position: relative;
      z-index: 1;
      padding: 1rem clamp(1.25rem, 3vw, 2.5rem) 1rem calc(2.25rem + clamp(0.75rem, 2vw, 1.5rem));
      display: flex;
      flex-direction: column;
      min-height: 0;
      flex: 1;
    }
    .layout-content > app-footer {
      position: relative;
      z-index: 1;
      display: block;
      margin-top: auto;
      flex-shrink: 0;
    }

    @media (max-width: 768px) {
      .layout { flex-direction: column; }
      .layout-gutter { display: none; }
      .layout-inner {
        padding: 0.875rem 0.875rem;
      }
      .layout-content {
        padding-bottom: calc(3.5rem + var(--safe-bottom, 0px));
      }
    }
  `],
})
export class LayoutComponent {
  readonly lineNumbers = Array.from({ length: 60 }, (_, i) => String(i + 1).padStart(2, '0'));
}
