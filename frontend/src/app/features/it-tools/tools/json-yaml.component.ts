import { Component, signal } from '@angular/core';
import * as yaml from 'js-yaml';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES, copyToClipboard } from '../tool-ui';

@Component({
  selector: 'app-tool-json-yaml',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="JSON ↔ YAML" subtitle="Bidirectional conversion between JSON and YAML">
      <div class="card">
        <label>
          JSON
          <textarea rows="10" [value]="json()" (input)="onJson($event)"></textarea>
        </label>
      </div>
      <div class="actions">
        <button class="btn btn-primary" (click)="jsonToYaml()">JSON → YAML</button>
        <button class="btn btn-primary" (click)="yamlToJson()">YAML → JSON</button>
      </div>
      <div class="card">
        <label>
          YAML
          <textarea rows="10" [value]="yamlText()" (input)="onYaml($event)"></textarea>
        </label>
        <div class="actions">
          <button class="btn" (click)="copyJson()">{{ copiedJson() ? 'Copied!' : 'Copy JSON' }}</button>
          <button class="btn" (click)="copyYaml()">{{ copiedYaml() ? 'Copied!' : 'Copy YAML' }}</button>
        </div>
      </div>
      @if (err()) {
        <p class="error">{{ err() }}</p>
      }
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES],
})
export class JsonYamlComponent {
  readonly json = signal('{\n  "name": "devsecvault",\n  "features": ["snippets", "payloads", "bridge"]\n}');
  readonly yamlText = signal('name: devsecvault\nfeatures:\n  - snippets\n  - payloads\n  - bridge\n');
  readonly err = signal('');
  readonly copiedJson = signal(false);
  readonly copiedYaml = signal(false);

  onJson(ev: Event) { this.json.set((ev.target as HTMLTextAreaElement).value); }
  onYaml(ev: Event) { this.yamlText.set((ev.target as HTMLTextAreaElement).value); }

  jsonToYaml() {
    try {
      const obj = JSON.parse(this.json());
      this.yamlText.set(yaml.dump(obj, { indent: 2, lineWidth: 120, sortKeys: false }));
      this.err.set('');
    } catch (e: unknown) {
      this.err.set('Invalid JSON: ' + (e as Error).message);
    }
  }
  yamlToJson() {
    try {
      const obj = yaml.load(this.yamlText());
      this.json.set(JSON.stringify(obj, null, 2));
      this.err.set('');
    } catch (e: unknown) {
      this.err.set('Invalid YAML: ' + (e as Error).message);
    }
  }
  async copyJson() {
    if (await copyToClipboard(this.json())) {
      this.copiedJson.set(true);
      setTimeout(() => this.copiedJson.set(false), 1500);
    }
  }
  async copyYaml() {
    if (await copyToClipboard(this.yamlText())) {
      this.copiedYaml.set(true);
      setTimeout(() => this.copiedYaml.set(false), 1500);
    }
  }
}
