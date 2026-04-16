import { Component } from '@angular/core';

@Component({
  selector: 'app-secure-bridge',
  template: `
    <div class="page">
      <h1 class="page-title">Secure Bridge</h1>
      <p class="page-subtitle">End-to-end encrypted transfers</p>
    </div>
  `,
  styles: [`
    .page { padding: 1rem 0; }
    .page-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--foreground);
      margin-bottom: 0.25rem;
    }
    .page-subtitle {
      font-size: 0.875rem;
      color: var(--muted-foreground);
    }
  `],
})
export class SecureBridgeComponent {}
