import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <div class="layout">
      <app-sidebar />
      <div class="layout-main">
        <app-topbar />
        <main class="layout-content">
          <router-outlet />
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
    .layout-content {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      -webkit-overflow-scrolling: touch;
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
    }
  `],
})
export class LayoutComponent {}
