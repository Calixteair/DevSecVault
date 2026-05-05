import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

const SITE_NAME = 'DevSecVault';
const ORIGIN = 'https://vault.calixteair.fr';
const DEFAULT_OG_IMAGE = `${ORIGIN}/icons/og-image.png`;
const DEFAULT_DESCRIPTION =
  'Plateforme cybersec auto-hébergée : bibliothèque de snippets, payloads chiffrés AES-256, partage de secrets E2E, IT Tools 100 % client. RGPD-friendly, sans cookie tiers.';

export interface SeoMeta {
  /** Page-specific title. Final <title> = `${title} | ${SITE_NAME}`. Use `null` to keep just the site name. */
  title?: string | null;
  /** ≤ 160 chars. Used for <meta description>, og:description and twitter:description. */
  description?: string;
  /** Pathname of the current page (e.g. "/legal/privacy"). Used for canonical and og:url. */
  path?: string;
  /** Optional override for the OG image URL. */
  ogImage?: string;
  /** noindex if `true`. Pages requiring auth set this. */
  noindex?: boolean;
}

/**
 * Per-page SEO orchestrator.
 *
 * Each component that wants its own metadata calls `apply({ ... })` from
 * `ngOnInit` (or after a routed data fetch). The defaults set in
 * `index.html` survive for unrouted edge cases (server prerender, hydration).
 *
 * Why service + not router-event-driven: explicit `apply()` per component
 * lets us pin metadata after async data (e.g. concept title) lands, instead
 * of fighting Angular Router's emit cadence.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  apply(input: SeoMeta = {}): void {
    const title = input.title
      ? `${input.title} | ${SITE_NAME}`
      : SITE_NAME;
    this.title.setTitle(title);

    const desc = (input.description ?? DEFAULT_DESCRIPTION).slice(0, 300);
    this.upsertName('description', desc);

    const path = (input.path ?? this.currentPath()).replace(/\/+$/, '') || '/';
    const url = `${ORIGIN}${path === '/' ? '/' : path}`;
    this.setCanonical(url);

    const ogImage = input.ogImage ?? DEFAULT_OG_IMAGE;
    this.upsertProperty('og:title', title);
    this.upsertProperty('og:description', desc);
    this.upsertProperty('og:url', url);
    this.upsertProperty('og:image', ogImage);
    this.upsertProperty('og:type', 'website');
    this.upsertProperty('og:site_name', SITE_NAME);
    this.upsertProperty('og:locale', 'fr_FR');

    this.upsertName('twitter:card', 'summary_large_image');
    this.upsertName('twitter:title', title);
    this.upsertName('twitter:description', desc);
    this.upsertName('twitter:image', ogImage);

    if (input.noindex) {
      this.upsertName('robots', 'noindex, nofollow');
    } else {
      this.removeMetaName('robots');
    }
  }

  private currentPath(): string {
    try {
      return this.doc.location?.pathname ?? '/';
    } catch {
      return '/';
    }
  }

  private setCanonical(href: string): void {
    let link = this.doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  private upsertName(name: string, content: string): void {
    if (this.meta.getTag(`name="${name}"`)) {
      this.meta.updateTag({ name, content });
    } else {
      this.meta.addTag({ name, content });
    }
  }

  private upsertProperty(property: string, content: string): void {
    if (this.meta.getTag(`property="${property}"`)) {
      this.meta.updateTag({ property, content });
    } else {
      this.meta.addTag({ property, content });
    }
  }

  private removeMetaName(name: string): void {
    this.meta.removeTag(`name="${name}"`);
  }
}
