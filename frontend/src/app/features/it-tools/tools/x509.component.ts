import { Component, computed, signal } from '@angular/core';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES } from '../tool-ui';

/**
 * Minimal DER/ASN.1 parser geared at X.509 v3 certificates.
 * We only decode what is useful for inspection (not full validation):
 *   subject, issuer, validity window, serial, signature alg, SANs, fingerprints.
 * For anything security-critical, use a real library — this is a read-only viewer.
 */

interface Asn1 {
  tag: number;
  cls: number;
  constructed: boolean;
  len: number;
  header: number;
  contents: Uint8Array;
  raw: Uint8Array;
  children?: Asn1[];
}

function parseAsn1(buf: Uint8Array, offset = 0): { node: Asn1; end: number } {
  const tagByte = buf[offset];
  const cls = tagByte >> 6;
  const constructed = (tagByte & 0x20) !== 0;
  let tag = tagByte & 0x1f;
  let i = offset + 1;
  if (tag === 0x1f) {
    tag = 0;
    while (true) {
      const b = buf[i++];
      tag = (tag << 7) | (b & 0x7f);
      if ((b & 0x80) === 0) break;
    }
  }
  let len = buf[i++];
  if ((len & 0x80) !== 0) {
    const n = len & 0x7f;
    len = 0;
    for (let k = 0; k < n; k++) len = (len << 8) | buf[i++];
  }
  const header = i - offset;
  const contents = buf.subarray(i, i + len);
  const raw = buf.subarray(offset, i + len);
  const node: Asn1 = { tag, cls, constructed, len, header, contents, raw };
  if (constructed) {
    node.children = [];
    let p = 0;
    while (p < contents.length) {
      const { node: child, end } = parseAsn1(contents, p);
      node.children.push(child);
      p = end;
    }
  }
  return { node, end: i + len };
}

function pemToDer(pem: string): Uint8Array {
  const b64 = pem.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const OID_NAMES: Record<string, string> = {
  '2.5.4.3': 'CN', '2.5.4.6': 'C', '2.5.4.7': 'L', '2.5.4.8': 'ST',
  '2.5.4.10': 'O', '2.5.4.11': 'OU', '1.2.840.113549.1.9.1': 'E',
  '2.5.29.17': 'subjectAltName', '2.5.29.15': 'keyUsage', '2.5.29.19': 'basicConstraints',
  '1.2.840.113549.1.1.11': 'sha256WithRSAEncryption',
  '1.2.840.113549.1.1.5': 'sha1WithRSAEncryption',
  '1.2.840.113549.1.1.13': 'sha512WithRSAEncryption',
  '1.2.840.10045.4.3.2': 'ecdsa-with-SHA256',
  '1.2.840.10045.4.3.3': 'ecdsa-with-SHA384',
  '1.3.101.112': 'Ed25519',
};

function decodeOid(bytes: Uint8Array): string {
  const parts: number[] = [Math.floor(bytes[0] / 40), bytes[0] % 40];
  let v = 0;
  for (let i = 1; i < bytes.length; i++) {
    v = (v << 7) | (bytes[i] & 0x7f);
    if ((bytes[i] & 0x80) === 0) { parts.push(v); v = 0; }
  }
  return parts.join('.');
}

function decodeString(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function parseName(node: Asn1): string {
  // Name ::= SEQUENCE OF RelativeDistinguishedName (SET OF AttributeTypeAndValue)
  const parts: string[] = [];
  for (const rdn of node.children ?? []) {
    for (const atv of rdn.children ?? []) {
      const [oidNode, valNode] = atv.children ?? [];
      if (!oidNode || !valNode) continue;
      const oid = decodeOid(oidNode.contents);
      const name = OID_NAMES[oid] ?? oid;
      parts.push(`${name}=${decodeString(valNode.contents)}`);
    }
  }
  return parts.join(', ');
}

function parseDate(node: Asn1): string {
  const s = decodeString(node.contents);
  // UTCTime: YYMMDDHHMMSSZ; GeneralizedTime: YYYYMMDDHHMMSSZ
  if (node.tag === 23 /* UTCTime */) {
    const yy = Number(s.slice(0, 2));
    const year = yy >= 50 ? 1900 + yy : 2000 + yy;
    return new Date(`${year}-${s.slice(2, 4)}-${s.slice(4, 6)}T${s.slice(6, 8)}:${s.slice(8, 10)}:${s.slice(10, 12)}Z`).toISOString();
  }
  if (node.tag === 24 /* GeneralizedTime */) {
    return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}Z`).toISOString();
  }
  return s;
}

function bytesToHex(b: Uint8Array, sep = ''): string {
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join(sep);
}

async function fingerprint(der: Uint8Array, algo: 'SHA-1' | 'SHA-256'): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest(algo, der as BufferSource));
  return bytesToHex(h, ':').toUpperCase();
}

interface CertInfo {
  subject: string;
  issuer: string;
  notBefore: string;
  notAfter: string;
  serial: string;
  signatureAlg: string;
  sans: string[];
  sha1: string;
  sha256: string;
}

async function parseCert(pem: string): Promise<CertInfo> {
  const der = pemToDer(pem);
  const { node: cert } = parseAsn1(der);
  const tbs = cert.children![0];
  // TBS: [0] version, serial, sigAlg, issuer, validity, subject, spki, ... extensions [3]
  let idx = 0;
  if (tbs.children![0].cls === 2 && tbs.children![0].tag === 0) idx = 1; // version tag
  const serial = tbs.children![idx++];
  const sigAlg = tbs.children![idx++];
  const issuer = tbs.children![idx++];
  const validity = tbs.children![idx++];
  const subject = tbs.children![idx++];
  idx++; // SPKI
  let extensions: Asn1 | undefined;
  for (; idx < tbs.children!.length; idx++) {
    const c = tbs.children![idx];
    if (c.cls === 2 && c.tag === 3) { extensions = c.children![0]; break; }
  }
  const sans: string[] = [];
  if (extensions) {
    for (const ext of extensions.children ?? []) {
      const oidNode = ext.children![0];
      const oid = decodeOid(oidNode.contents);
      if (oid === '2.5.29.17') {
        const valueOctet = ext.children![ext.children!.length - 1];
        const { node: seq } = parseAsn1(valueOctet.contents);
        for (const gn of seq.children ?? []) {
          if (gn.tag === 2) sans.push(decodeString(gn.contents)); // dNSName
          else if (gn.tag === 7) sans.push(`IP:${Array.from(gn.contents).join('.')}`); // iPAddress v4
        }
      }
    }
  }
  const sigAlgOid = decodeOid(sigAlg.children![0].contents);
  return {
    subject: parseName(subject),
    issuer: parseName(issuer),
    notBefore: parseDate(validity.children![0]),
    notAfter: parseDate(validity.children![1]),
    serial: bytesToHex(serial.contents, ':').toUpperCase(),
    signatureAlg: OID_NAMES[sigAlgOid] ?? sigAlgOid,
    sans,
    sha1: await fingerprint(der, 'SHA-1'),
    sha256: await fingerprint(der, 'SHA-256'),
  };
}

@Component({
  selector: 'app-tool-x509',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="X.509 Parser" subtitle="Inspect PEM certificates — parsed locally, nothing sent">
      <div class="card">
        <label>
          Certificate (PEM)
          <textarea rows="10" [value]="pem()" (input)="onPem($event)" placeholder="-----BEGIN CERTIFICATE-----..."></textarea>
        </label>
        @if (err()) {
          <p class="error">{{ err() }}</p>
        }
      </div>
      @if (info(); as c) {
        <div class="card">
          <h3 class="card-title">Certificate details</h3>
          <div class="output-row"><span class="meta">Subject</span><span class="output-val">{{ c.subject }}</span></div>
          <div class="output-row"><span class="meta">Issuer</span><span class="output-val">{{ c.issuer }}</span></div>
          <div class="output-row"><span class="meta">Valid from</span><span class="output-val">{{ c.notBefore }}</span></div>
          <div class="output-row"><span class="meta">Valid until</span><span class="output-val">{{ c.notAfter }}</span></div>
          <div class="output-row"><span class="meta">Serial</span><span class="output-val">{{ c.serial }}</span></div>
          <div class="output-row"><span class="meta">Signature</span><span class="output-val">{{ c.signatureAlg }}</span></div>
          @if (c.sans.length > 0) {
            <div class="output-row" style="align-items:flex-start;flex-direction:column;gap:0.25rem;">
              <span class="meta">Subject Alternative Names</span>
              @for (s of c.sans; track s) {
                <span class="output-val">{{ s }}</span>
              }
            </div>
          }
          <div class="output-row"><span class="meta">SHA-1 fingerprint</span><span class="output-val">{{ c.sha1 }}</span></div>
          <div class="output-row"><span class="meta">SHA-256 fingerprint</span><span class="output-val">{{ c.sha256 }}</span></div>
        </div>
      }
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES],
})
export class X509Component {
  readonly pem = signal(`-----BEGIN CERTIFICATE-----
Paste a PEM-encoded X.509 certificate here to inspect it.
-----END CERTIFICATE-----`);
  readonly info = signal<CertInfo | null>(null);
  readonly err = signal('');

  constructor() {
    // Parse on every pem() change — keep it simple, no effect needed since we sign explicitly on input.
    this.parse(this.pem());
  }

  onPem(ev: Event) {
    const v = (ev.target as HTMLTextAreaElement).value;
    this.pem.set(v);
    this.parse(v);
  }

  private async parse(pem: string) {
    if (!pem.includes('BEGIN CERTIFICATE')) {
      this.info.set(null);
      this.err.set('Paste a PEM certificate (starts with -----BEGIN CERTIFICATE-----).');
      return;
    }
    try {
      const info = await parseCert(pem);
      this.info.set(info);
      this.err.set('');
    } catch (e) {
      this.info.set(null);
      this.err.set('Failed to parse: ' + (e as Error).message);
    }
  }
}
