import { Component, signal } from '@angular/core';
import bcrypt from 'bcryptjs';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES, copyToClipboard } from '../tool-ui';

@Component({
  selector: 'app-tool-bcrypt',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="Bcrypt" subtitle="Hash and verify passwords using bcrypt">
      <div class="card">
        <h3 class="card-title">Hash</h3>
        <label>
          Password
          <input type="text" [value]="pwd()" (input)="onPwd($event)" />
        </label>
        <label>
          Cost (rounds)
          <input type="number" min="4" max="15" [value]="rounds()" (input)="onRounds($event)" />
        </label>
        <div class="actions">
          <button class="btn btn-primary" (click)="doHash()" [disabled]="hashing()">
            {{ hashing() ? 'Hashing...' : 'Hash' }}
          </button>
        </div>
        <label>
          Hash
          <div class="output-val">{{ hash() }}</div>
        </label>
        <div class="actions">
          <button class="btn" (click)="copyHash()">{{ copied() ? 'Copied!' : 'Copy hash' }}</button>
        </div>
      </div>
      <div class="card">
        <h3 class="card-title">Verify</h3>
        <label>
          Password to check
          <input type="text" [value]="verifyPwd()" (input)="onVerifyPwd($event)" />
        </label>
        <label>
          Hash to check against
          <input type="text" [value]="verifyHash()" (input)="onVerifyHash($event)" />
        </label>
        <div class="actions">
          <button class="btn btn-primary" (click)="doVerify()">Verify</button>
          @if (verifyResult() !== null) {
            <span [style.color]="verifyResult() ? 'var(--primary)' : 'var(--destructive)'"
                  style="align-self:center;font-family:JetBrains Mono,monospace">
              {{ verifyResult() ? '✓ Match' : '✗ No match' }}
            </span>
          }
        </div>
      </div>
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES],
})
export class BcryptComponent {
  readonly pwd = signal('my-password');
  readonly rounds = signal(10);
  readonly hash = signal('');
  readonly hashing = signal(false);
  readonly copied = signal(false);
  readonly verifyPwd = signal('my-password');
  readonly verifyHash = signal('');
  readonly verifyResult = signal<boolean | null>(null);

  onPwd(ev: Event) { this.pwd.set((ev.target as HTMLInputElement).value); }
  onRounds(ev: Event) { this.rounds.set(Number((ev.target as HTMLInputElement).value)); }
  onVerifyPwd(ev: Event) { this.verifyPwd.set((ev.target as HTMLInputElement).value); }
  onVerifyHash(ev: Event) { this.verifyHash.set((ev.target as HTMLInputElement).value); }

  async doHash() {
    this.hashing.set(true);
    // Use setTimeout to let the UI update before the (blocking) sync hash
    await new Promise(r => setTimeout(r, 10));
    try {
      const h = bcrypt.hashSync(this.pwd(), this.rounds());
      this.hash.set(h);
    } finally {
      this.hashing.set(false);
    }
  }
  async doVerify() {
    this.verifyResult.set(bcrypt.compareSync(this.verifyPwd(), this.verifyHash()));
  }
  async copyHash() {
    if (await copyToClipboard(this.hash())) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    }
  }
}
