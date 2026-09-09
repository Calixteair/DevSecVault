/**
 * Central registry of all IT Tools.
 *
 * Each entry maps a tool slug (used in the URL) to its metadata. The `load`
 * function returns a Promise that resolves to the component class, so Angular
 * can lazy-load the tool on navigation.
 *
 * Adding a new tool = 1 new entry here + 1 new file under ./tools/.
 */
import { Type } from '@angular/core';

export type ToolCategory = 'crypto' | 'network' | 'encoding' | 'dev' | 'cybersec';

export interface ToolDef {
  slug: string;
  title: string;
  description: string;
  icon: string; // lucide icon name (kebab-case)
  category: ToolCategory;
  load: () => Promise<Type<unknown>>;
}

export interface CategoryDef {
  id: ToolCategory;
  label: string;
  /** CSS variable name for the category accent color */
  colorVar: string;
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'crypto', label: 'Cryptography', colorVar: '--accent' },
  { id: 'network', label: 'Network', colorVar: '--primary' },
  { id: 'encoding', label: 'Encoding', colorVar: '--chart-3' },
  { id: 'dev', label: 'Dev', colorVar: '--chart-4' },
  { id: 'cybersec', label: 'Cybersec', colorVar: '--destructive' },
];

export const TOOLS: ToolDef[] = [
  // ── Crypto ──────────────────────────────────────────────────────────────
  {
    slug: 'hash-text',
    title: 'Hash Text',
    description: 'MD5, SHA-1, SHA-256, SHA-512, SHA-3 hashing',
    icon: 'hash',
    category: 'crypto',
    load: () => import('./tools/hash-text.component').then(m => m.HashTextComponent),
  },
  {
    slug: 'hmac',
    title: 'HMAC Generator',
    description: 'HMAC with custom key and multiple algorithms',
    icon: 'key',
    category: 'crypto',
    load: () => import('./tools/hmac.component').then(m => m.HmacComponent),
  },
  {
    slug: 'bcrypt',
    title: 'Bcrypt',
    description: 'Hash and verify passwords with bcrypt',
    icon: 'lock',
    category: 'crypto',
    load: () => import('./tools/bcrypt.component').then(m => m.BcryptComponent),
  },
  {
    slug: 'base64',
    title: 'Base64',
    description: 'Encode and decode text to/from Base64',
    icon: 'binary',
    category: 'crypto',
    load: () => import('./tools/base64.component').then(m => m.Base64Component),
  },
  {
    slug: 'jwt-parser',
    title: 'JWT Parser',
    description: 'Decode and inspect JWT tokens (no signature check)',
    icon: 'ticket',
    category: 'crypto',
    load: () => import('./tools/jwt-parser.component').then(m => m.JwtParserComponent),
  },
  {
    slug: 'uuid',
    title: 'UUID Generator',
    description: 'Generate UUID v4 or v7 (time-based)',
    icon: 'fingerprint',
    category: 'crypto',
    load: () => import('./tools/uuid.component').then(m => m.UuidComponent),
  },
  {
    slug: 'password',
    title: 'Password Generator',
    description: 'Strong passwords with entropy meter',
    icon: 'key-round',
    category: 'crypto',
    load: () => import('./tools/password.component').then(m => m.PasswordComponent),
  },
  {
    slug: 'totp',
    title: 'TOTP Generator',
    description: 'RFC 6238 time-based one-time passwords + QR code',
    icon: 'shield-check',
    category: 'crypto',
    load: () => import('./tools/totp.component').then(m => m.TotpComponent),
  },

  // ── Network ─────────────────────────────────────────────────────────────
  {
    slug: 'subnet',
    title: 'Subnet Calculator',
    description: 'IPv4 CIDR, mask, broadcast, ranges',
    icon: 'network',
    category: 'network',
    load: () => import('./tools/subnet.component').then(m => m.SubnetComponent),
  },
  {
    slug: 'vlsm',
    title: 'VLSM Calculator',
    description: 'Split a network into variable-length subnets by host count',
    icon: 'split',
    category: 'network',
    load: () => import('./tools/vlsm.component').then(m => m.VlsmComponent),
  },
  {
    slug: 'ipv4-int',
    title: 'IPv4 ↔ Integer',
    description: 'Convert IPv4 addresses to/from 32-bit integers',
    icon: 'arrow-right-left',
    category: 'network',
    load: () => import('./tools/ipv4-int.component').then(m => m.Ipv4IntComponent),
  },
  {
    slug: 'mac-lookup',
    title: 'MAC Lookup',
    description: 'Resolve OUI vendor from MAC address',
    icon: 'radio',
    category: 'network',
    load: () => import('./tools/mac-lookup.component').then(m => m.MacLookupComponent),
  },
  {
    slug: 'url-parser',
    title: 'URL Parser',
    description: 'Decompose URL into scheme, host, path, query',
    icon: 'link',
    category: 'network',
    load: () => import('./tools/url-parser.component').then(m => m.UrlParserComponent),
  },
  {
    slug: 'user-agent',
    title: 'User-Agent Parser',
    description: 'Identify browser, OS, device from User-Agent',
    icon: 'monitor',
    category: 'network',
    load: () => import('./tools/user-agent.component').then(m => m.UserAgentComponent),
  },

  // ── Encoding ────────────────────────────────────────────────────────────
  {
    slug: 'base-converter',
    title: 'Base Converter',
    description: 'Convert between binary, octal, decimal, hex',
    icon: 'calculator',
    category: 'encoding',
    load: () => import('./tools/base-converter.component').then(m => m.BaseConverterComponent),
  },
  {
    slug: 'url-encode',
    title: 'URL Encode/Decode',
    description: 'Percent-encoding for URLs',
    icon: 'percent',
    category: 'encoding',
    load: () => import('./tools/url-encode.component').then(m => m.UrlEncodeComponent),
  },
  {
    slug: 'json-formatter',
    title: 'JSON Formatter',
    description: 'Validate, format, or minify JSON',
    icon: 'braces',
    category: 'encoding',
    load: () => import('./tools/json-formatter.component').then(m => m.JsonFormatterComponent),
  },
  {
    slug: 'json-yaml',
    title: 'JSON ↔ YAML',
    description: 'Bidirectional JSON/YAML conversion',
    icon: 'file-code',
    category: 'encoding',
    load: () => import('./tools/json-yaml.component').then(m => m.JsonYamlComponent),
  },

  // ── Dev ─────────────────────────────────────────────────────────────────
  {
    slug: 'regex',
    title: 'Regex Tester',
    description: 'Test and explain regular expressions',
    icon: 'regex',
    category: 'dev',
    load: () => import('./tools/regex.component').then(m => m.RegexComponent),
  },
  {
    slug: 'cron',
    title: 'Cron Builder',
    description: 'Build cron expressions with human-readable output',
    icon: 'clock',
    category: 'dev',
    load: () => import('./tools/cron.component').then(m => m.CronComponent),
  },
  {
    slug: 'chmod',
    title: 'Chmod Calculator',
    description: 'Unix file permissions: symbolic ↔ octal',
    icon: 'file-lock',
    category: 'dev',
    load: () => import('./tools/chmod.component').then(m => m.ChmodComponent),
  },
  {
    slug: 'text-diff',
    title: 'Text Diff',
    description: 'Compare two texts line by line',
    icon: 'git-compare',
    category: 'dev',
    load: () => import('./tools/text-diff.component').then(m => m.TextDiffComponent),
  },

  // ── Cybersec ────────────────────────────────────────────────────────────
  {
    slug: 'x509',
    title: 'X.509 Parser',
    description: 'Inspect PEM certificates: subject, issuer, SANs',
    icon: 'badge-check',
    category: 'cybersec',
    load: () => import('./tools/x509.component').then(m => m.X509Component),
  },
  {
    slug: 'cvss',
    title: 'CVSS Calculator',
    description: 'Score vulnerabilities with CVSS 3.1 or 4.0',
    icon: 'triangle-alert',
    category: 'cybersec',
    load: () => import('./tools/cvss.component').then(m => m.CvssComponent),
  },
];

export function findTool(slug: string): ToolDef | undefined {
  return TOOLS.find(t => t.slug === slug);
}

export function findCategory(id: ToolCategory): CategoryDef {
  return CATEGORIES.find(c => c.id === id)!;
}
