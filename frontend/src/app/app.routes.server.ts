import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Public pages — server-side rendered for SEO
  { path: 'dashboard', renderMode: RenderMode.Client },
  { path: 'dev-library', renderMode: RenderMode.Client },
  { path: 'it-tools', renderMode: RenderMode.Client },
  { path: 'it-tools/:slug', renderMode: RenderMode.Client },

  // Auth-dependent pages — client-only (use Web Crypto, localStorage, etc.)
  { path: 'cyber-toolbox', renderMode: RenderMode.Client },
  { path: 'secure-bridge', renderMode: RenderMode.Client },
  { path: 'secret/:id', renderMode: RenderMode.Client },
  { path: 'teams', renderMode: RenderMode.Client },
  { path: 'teams/**', renderMode: RenderMode.Client },
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/reports', renderMode: RenderMode.Client },
  { path: 'settings', renderMode: RenderMode.Client },
  { path: 'profile', renderMode: RenderMode.Client },
  { path: 'invite/:token', renderMode: RenderMode.Client },

  // Legal pages — fully static, can be SSR'd for SEO + offline reads.
  { path: 'legal/terms', renderMode: RenderMode.Client },
  { path: 'legal/privacy', renderMode: RenderMode.Client },
  { path: 'legal/notice', renderMode: RenderMode.Client },
  { path: 'legal/abuse', renderMode: RenderMode.Client },
  { path: 'support', renderMode: RenderMode.Client },

  // Catch-all fallback
  { path: '**', renderMode: RenderMode.Client },
];
