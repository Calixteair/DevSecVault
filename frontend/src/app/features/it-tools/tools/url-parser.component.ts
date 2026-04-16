import { Component, computed, signal } from '@angular/core';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES } from '../tool-ui';

interface Parsed {
  protocol: string;
  username: string;
  password: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;
  params: [string, string][];
}

@Component({
  selector: 'app-tool-url-parser',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="URL Parser" subtitle="Decompose a URL into its standard parts">
      <div class="card">
        <label>
          URL
          <input type="text" placeholder="https://user:pass@example.com:8080/path?foo=bar&baz=1#frag"
                 [value]="url()" (input)="onInput($event)" />
        </label>
      </div>
      @if (parsed(); as p) {
        <div class="card">
          <dl class="kv">
            <dt>Protocol</dt><dd>{{ p.protocol }}</dd>
            <dt>Origin</dt><dd>{{ p.origin }}</dd>
            <dt>Username</dt><dd>{{ p.username || '—' }}</dd>
            <dt>Password</dt><dd>{{ p.password || '—' }}</dd>
            <dt>Host</dt><dd>{{ p.host }}</dd>
            <dt>Hostname</dt><dd>{{ p.hostname }}</dd>
            <dt>Port</dt><dd>{{ p.port || '(default)' }}</dd>
            <dt>Pathname</dt><dd>{{ p.pathname }}</dd>
            <dt>Search</dt><dd>{{ p.search || '—' }}</dd>
            <dt>Hash</dt><dd>{{ p.hash || '—' }}</dd>
          </dl>
        </div>
        @if (p.params.length > 0) {
          <div class="card">
            <h3 class="card-title">Query parameters</h3>
            <dl class="kv">
              @for (kv of p.params; track $index) {
                <dt>{{ kv[0] }}</dt><dd>{{ kv[1] }}</dd>
              }
            </dl>
          </div>
        }
      } @else if (url().length > 0) {
        <p class="error">Invalid URL.</p>
      }
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES],
})
export class UrlParserComponent {
  readonly url = signal('https://user:pass@example.com:8080/api/v1/users?active=true&role=admin#top');

  readonly parsed = computed<Parsed | null>(() => {
    try {
      const u = new URL(this.url());
      return {
        protocol: u.protocol,
        username: u.username,
        password: u.password,
        host: u.host,
        hostname: u.hostname,
        port: u.port,
        pathname: u.pathname,
        search: u.search,
        hash: u.hash,
        origin: u.origin,
        params: Array.from(u.searchParams.entries()),
      };
    } catch {
      return null;
    }
  });

  onInput(ev: Event) { this.url.set((ev.target as HTMLInputElement).value); }
}
