import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // Public landing — full-bleed marketing page outside the app layout
  // (no sidebar/topbar). Indexed by search engines.
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent),
  },
  // Public Secure Bridge viewer — lives OUTSIDE the main layout so recipients
  // (including guests) see a minimalist page without sidebar/topbar.
  {
    path: 'secret/:id',
    loadComponent: () => import('./features/secure-bridge/secret-viewer.component').then(m => m.SecretViewerComponent),
  },
  {
    path: 'invite/:token',
    loadComponent: () => import('./features/teams/invite-landing.component').then(m => m.InviteLandingComponent),
  },
  // Legal pages — public, accessible to guests, rendered outside the main
  // layout (no sidebar/topbar) so they stay reachable from the login page,
  // the secret viewer and the invite landing alike.
  {
    path: 'legal/terms',
    loadComponent: () => import('./features/legal/terms.component').then(m => m.LegalTermsComponent),
  },
  {
    path: 'legal/privacy',
    loadComponent: () => import('./features/legal/privacy.component').then(m => m.LegalPrivacyComponent),
  },
  {
    path: 'legal/notice',
    loadComponent: () => import('./features/legal/notice.component').then(m => m.LegalNoticeComponent),
  },
  {
    path: 'legal/abuse',
    loadComponent: () => import('./features/legal/abuse.component').then(m => m.LegalAbuseComponent),
  },
  {
    path: 'support',
    loadComponent: () => import('./features/support/support.component').then(m => m.SupportComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'dev-library',
        loadComponent: () => import('./features/dev-library/dev-library.component').then(m => m.DevLibraryComponent),
      },
      {
        path: 'cyber-toolbox',
        loadComponent: () => import('./features/cyber-toolbox/cyber-toolbox.component').then(m => m.CyberToolboxComponent),
      },
      {
        path: 'secure-bridge',
        loadComponent: () => import('./features/secure-bridge/secure-bridge.component').then(m => m.SecureBridgeComponent),
      },
      {
        path: 'teams',
        loadChildren: () => import('./features/teams/teams.routes').then(m => m.teamsRoutes),
      },
      {
        path: 'search',
        loadComponent: () => import('./features/search/search-results.component').then(m => m.SearchResultsComponent),
      },
      {
        path: 'it-tools',
        loadComponent: () => import('./features/it-tools/it-tools.component').then(m => m.ItToolsComponent),
      },
      {
        path: 'it-tools/:slug',
        loadComponent: () => import('./features/it-tools/tool-host.component').then(m => m.ToolHostComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
      },
      {
        path: 'settings/tokens',
        loadComponent: () => import('./features/settings/api-tokens.component').then(m => m.ApiTokensComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
      },
      {
        path: 'admin',
        loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
        canActivate: [adminGuard],
      },
      {
        path: 'admin/reports',
        loadComponent: () =>
          import('./features/admin/reports/reports.component').then(m => m.AdminReportsComponent),
        canActivate: [adminGuard],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
