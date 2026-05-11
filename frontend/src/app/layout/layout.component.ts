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
          <router-outlet />
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
    }
    .layout-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }
    /* Flex column so we can push the footer to the bottom of the scroll
       container with margin-top:auto, even on short pages. */
    .layout-content {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      -webkit-overflow-scrolling: touch;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    /* Footer pinned to the bottom of the scroll viewport (sticky-bottom
       behaviour without position:sticky, no overlap with page content). */
    .layout-content > app-footer {
      display: block;
      margin: 2rem -1.5rem -1.5rem;
      margin-top: auto;
      flex-shrink: 0;
    }

    @media (max-width: 768px) {
      .layout {
        flex-direction: column;
        height: 100dvh;
      }
      .layout-content {
        padding: 1rem 0.75rem;
        /* Leave room for bottom nav */
        padding-bottom: calc(3.5rem + var(--safe-bottom, 0px) + 0.5rem);
      }
      .layout-content > app-footer {
        margin: 1.5rem -0.75rem 0;
        margin-top: auto;
      }
    }
  `],
})
export class LayoutComponent {}
