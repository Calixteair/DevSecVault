import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  template: `
    <div class="page">
      <h1 class="page-title">Login</h1>
      <p class="page-subtitle">Sign in to DevSec Vault</p>
    </div>
  `,
  styles: [`
    .page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: var(--background);
    }
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
export class LoginComponent {}
