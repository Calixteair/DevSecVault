import { Injectable } from '@angular/core';
import { argon2id } from 'hash-wasm';

/**
 * Client-side crypto for Secure Bridge.
 *
 * Two flavors:
 *  - Personal vault: key derived from a user passphrase via Argon2id
 *    (memory-hard, GPU/ASIC-resistant). The derived key is used with AES-GCM.
 *  - Shared link: a random 32-byte key generated per link and carried in the
 *    URL fragment. The server never sees it.
 *
 * In every case the server only receives opaque base64 payloads.
 */
@Injectable({ providedIn: 'root' })
export class SecureBridgeCryptoService {
  /** Argon2id parameters — tuned for modern desktop browsers (~500ms). */
  private static readonly ARGON2_MEMORY_KIB = 65536; // 64 MiB
  private static readonly ARGON2_ITERATIONS = 3;
  private static readonly ARGON2_PARALLELISM = 4;
  private static readonly KEY_BYTES = 32; // AES-256
  private static readonly SALT_BYTES = 16;
  private static readonly IV_BYTES = 12;

  /** 16 random bytes, used as Argon2id salt. */
  randomSalt(): Uint8Array {
    const salt = new Uint8Array(SecureBridgeCryptoService.SALT_BYTES);
    crypto.getRandomValues(salt);
    return salt;
  }

  /** Derive an AES-GCM CryptoKey from a passphrase + salt via Argon2id. */
  async deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const raw = await argon2id({
      password: passphrase,
      salt,
      iterations: SecureBridgeCryptoService.ARGON2_ITERATIONS,
      memorySize: SecureBridgeCryptoService.ARGON2_MEMORY_KIB,
      parallelism: SecureBridgeCryptoService.ARGON2_PARALLELISM,
      hashLength: SecureBridgeCryptoService.KEY_BYTES,
      outputType: 'binary',
    });

    return crypto.subtle.importKey(
      'raw',
      this.toArrayBuffer(raw as Uint8Array),
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  /** Generate a fresh random AES-256-GCM key for a shared link. */
  async generateRandomKey(): Promise<{ key: CryptoKey; keyBase64: string }> {
    const raw = new Uint8Array(SecureBridgeCryptoService.KEY_BYTES);
    crypto.getRandomValues(raw);
    const key = await crypto.subtle.importKey(
      'raw',
      this.toArrayBuffer(raw),
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    );
    return { key, keyBase64: this.bytesToBase64Url(raw) };
  }

  /** Import a previously generated random key from its URL-fragment form. */
  async importRandomKey(keyBase64Url: string): Promise<CryptoKey> {
    const raw = this.base64UrlToBytes(keyBase64Url);
    return crypto.subtle.importKey(
      'raw',
      this.toArrayBuffer(raw),
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    );
  }

  /**
   * AES-GCM encrypt. Output is base64(iv || ciphertext || tag).
   * The IV is random and prepended so the caller only has to ship one blob.
   */
  async encrypt(plaintext: string, key: CryptoKey): Promise<string> {
    const iv = new Uint8Array(SecureBridgeCryptoService.IV_BYTES);
    crypto.getRandomValues(iv);

    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: this.toArrayBuffer(iv) },
      key,
      new TextEncoder().encode(plaintext),
    );

    const combined = new Uint8Array(iv.byteLength + ct.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ct), iv.byteLength);
    return this.bytesToBase64(combined);
  }

  /**
   * AES-GCM decrypt of a blob produced by {@link encrypt}. Throws on tag
   * mismatch (wrong key / corrupt ciphertext).
   */
  async decrypt(ciphertextBase64: string, key: CryptoKey): Promise<string> {
    const combined = this.base64ToBytes(ciphertextBase64);
    if (combined.byteLength <= SecureBridgeCryptoService.IV_BYTES) {
      throw new Error('Ciphertext too short.');
    }
    const iv = combined.slice(0, SecureBridgeCryptoService.IV_BYTES);
    const ct = combined.slice(SecureBridgeCryptoService.IV_BYTES);

    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: this.toArrayBuffer(iv) },
      key,
      this.toArrayBuffer(ct),
    );
    return new TextDecoder().decode(plain);
  }

  /**
   * Copy a Uint8Array into a plain ArrayBuffer. Needed because TS 5.9 types
   * Uint8Array as `Uint8Array<ArrayBufferLike>`, which does not satisfy the
   * stricter `BufferSource` overloads exposed by Web Crypto.
   */
  private toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const out = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(out).set(bytes);
    return out;
  }

  // ---- Encoding helpers ----------------------------------------------------

  bytesToBase64(bytes: Uint8Array): string {
    let bin = '';
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  base64ToBytes(b64: string): Uint8Array {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  bytesToBase64Url(bytes: Uint8Array): string {
    return this.bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  base64UrlToBytes(b64url: string): Uint8Array {
    let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    return this.base64ToBytes(b64);
  }
}
