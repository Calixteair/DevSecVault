import { Routes } from '@angular/router';

export const routes: Routes = [
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
        path: 'it-tools',
        loadComponent: () => import('./features/it-tools/it-tools.component').then(m => m.ItToolsComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
      },
    ],
  },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent),
  },
  { path: '**', redirectTo: 'dashboard' },
];
