import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'devsecvault-theme';
  readonly isDark = signal<boolean>(this.getInitialTheme());

  constructor() {
    effect(() => {
      const dark = this.isDark();
      if (typeof window !== 'undefined') {
        const root = document.documentElement;
        if (dark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
        localStorage.setItem(this.storageKey, dark ? 'dark' : 'light');
      }
    });
  }

  toggle(): void {
    this.isDark.set(!this.isDark());
  }

  private getInitialTheme(): boolean {
    if (typeof window === 'undefined') {
      return true; // SSR default: dark
    }
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      return stored === 'dark';
    }
    return true; // Default to dark mode
  }
}
