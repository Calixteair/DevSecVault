import { Routes } from '@angular/router';

export const teamsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./teams-page.component').then(m => m.TeamsPageComponent),
  },
];
