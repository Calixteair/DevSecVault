import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Marketing & static editorial — prerendered for SEO. Build emits real
  // HTML (with meta tags, canonical, JSON-LD) so Google / LinkedIn / Discord
  // see the actual content rather than <app-root></app-root>.
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'support', renderMode: RenderMode.Prerender },
  { path: 'legal/terms', renderMode: RenderMode.Prerender },
  { path: 'legal/privacy', renderMode: RenderMode.Prerender },
  { path: 'legal/notice', renderMode: RenderMode.Prerender },
  { path: 'legal/abuse', renderMode: RenderMode.Prerender },

  // Authenticated app shell — depends on Keycloak token, OIDC iframe, Web
  // Crypto API, localStorage. Server-rendering would either flicker or fail.
  { path: 'dashboard', renderMode: RenderMode.Client },
  { path: 'dev-library', renderMode: RenderMode.Client },
  { path: 'it-tools', renderMode: RenderMode.Client },
  { path: 'it-tools/:slug', renderMode: RenderMode.Client },
  { path: 'cyber-toolbox', renderMode: RenderMode.Client },
  { path: 'secure-bridge', renderMode: RenderMode.Client },
  { path: 'secret/:id', renderMode: RenderMode.Client },
  { path: 'teams', renderMode: RenderMode.Client },
  { path: 'teams/**', renderMode: RenderMode.Client },
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/reports', renderMode: RenderMode.Client },
  { path: 'settings', renderMode: RenderMode.Client },
  { path: 'settings/tokens', renderMode: RenderMode.Client },
  { path: 'profile', renderMode: RenderMode.Client },
  { path: 'invite/:token', renderMode: RenderMode.Client },
  { path: 'search', renderMode: RenderMode.Client },

  // Catch-all fallback
  { path: '**', renderMode: RenderMode.Client },
];
