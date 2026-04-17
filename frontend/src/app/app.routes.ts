import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
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
  {
    path: '',
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
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
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
      },
      {
        path: 'admin',
        loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
        canActivate: [adminGuard],
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
