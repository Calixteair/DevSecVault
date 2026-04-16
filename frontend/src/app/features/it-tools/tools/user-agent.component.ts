import { Component, computed, signal } from '@angular/core';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES } from '../tool-ui';

/**
 * Lightweight User-Agent parser. Covers the main cases without pulling in
 * ua-parser-js (which alone is ~60 KB). Falls back to "Unknown" on exotic UAs.
 */
function parseUserAgent(ua: string) {
  let browser = { name: 'Unknown', version: '' };
  let os = { name: 'Unknown', version: '' };
  let device = 'Desktop';

  // OS detection (order matters)
  if (/Windows NT 10/.test(ua)) os = { name: 'Windows', version: '10/11' };
  else if (/Windows NT 6.3/.test(ua)) os = { name: 'Windows', version: '8.1' };
  else if (/Windows NT 6.1/.test(ua)) os = { name: 'Windows', version: '7' };
  else if (/Android (\d+[.\d]*)/.test(ua)) {
    os = { name: 'Android', version: RegExp.$1 };
    device = /Mobile/.test(ua) ? 'Mobile' : 'Tablet';
  }
  else if (/iPhone OS (\d+[_\d]*)/.test(ua)) {
    os = { name: 'iOS', version: RegExp.$1.replace(/_/g, '.') };
    device = 'Mobile';
  }
  else if (/iPad; CPU OS (\d+[_\d]*)/.test(ua)) {
    os = { name: 'iPadOS', version: RegExp.$1.replace(/_/g, '.') };
    device = 'Tablet';
  }
  else if (/Mac OS X (\d+[._\d]*)/.test(ua)) {
    os = { name: 'macOS', version: RegExp.$1.replace(/_/g, '.') };
  }
  else if (/Ubuntu/.test(ua)) os = { name: 'Ubuntu', version: '' };
  else if (/Linux/.test(ua)) os = { name: 'Linux', version: '' };
  else if (/CrOS/.test(ua)) os = { name: 'ChromeOS', version: '' };

  // Browser detection (order matters: Edge before Chrome, etc.)
  if (/Edg\/(\d+[.\d]*)/.test(ua)) browser = { name: 'Edge', version: RegExp.$1 };
  else if (/OPR\/(\d+[.\d]*)/.test(ua)) browser = { name: 'Opera', version: RegExp.$1 };
  else if (/Firefox\/(\d+[.\d]*)/.test(ua)) browser = { name: 'Firefox', version: RegExp.$1 };
  else if (/Chrome\/(\d+[.\d]*)/.test(ua)) browser = { name: 'Chrome', version: RegExp.$1 };
  else if (/Version\/(\d+[.\d]*).*Safari/.test(ua)) browser = { name: 'Safari', version: RegExp.$1 };
  else if (/curl\/(\d+[.\d]*)/.test(ua)) browser = { name: 'curl', version: RegExp.$1 };
  else if (/wget/i.test(ua)) browser = { name: 'wget', version: '' };

  const bot = /bot|crawl|spider|headless/i.test(ua);

  return { browser, os, device, bot };
}

@Component({
  selector: 'app-tool-user-agent',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="User-Agent Parser" subtitle="Identify browser, OS and device">
      <div class="card">
        <label>
          User-Agent string
          <textarea rows="3" [value]="ua()" (input)="onInput($event)"
                    placeholder="Paste a User-Agent header"></textarea>
        </label>
        <div class="actions">
          <button class="btn" (click)="loadMine()">Use my browser's UA</button>
        </div>
      </div>
      @if (parsed(); as p) {
        <div class="card">
          <dl class="kv">
            <dt>Browser</dt><dd>{{ p.browser.name }} {{ p.browser.version }}</dd>
            <dt>OS</dt><dd>{{ p.os.name }} {{ p.os.version }}</dd>
            <dt>Device type</dt><dd>{{ p.device }}</dd>
            <dt>Bot</dt><dd>{{ p.bot ? 'Yes' : 'No' }}</dd>
          </dl>
        </div>
      }
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES],
})
export class UserAgentComponent {
  readonly ua = signal('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  readonly parsed = computed(() => parseUserAgent(this.ua()));

  onInput(ev: Event) { this.ua.set((ev.target as HTMLTextAreaElement).value); }
  loadMine() {
    if (typeof navigator !== 'undefined') this.ua.set(navigator.userAgent);
  }
}
