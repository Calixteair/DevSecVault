<?php

declare(strict_types=1);

namespace App\Security;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * AES-256-GCM envelope cipher for Cyber Toolbox payload bodies.
 *
 * Envelope layout (all binary, then base64 for DB storage):
 *
 *     [ 12-byte nonce ][ ciphertext ][ 16-byte auth tag ]
 *
 * The key is a base64-encoded 32-byte secret provisioned via Symfony Secrets
 * (or plain env var in dev). Any tampering with the stored envelope — even
 * a single flipped bit — fails the GCM tag check and raises
 * PayloadCipherException instead of silently returning garbage.
 *
 * SECURITY: this is the Cyber Toolbox server-side encryption — its goal is
 * to make payload bodies opaque on disk so a hosting-provider AV scan cannot
 * flag the database volume. It is NOT an E2E mechanism (the server holds the
 * key); that role is covered by Secure Bridge in Phase 5.
 */
final class PayloadCipher
{
    private const CIPHER = 'aes-256-gcm';
    private const KEY_BYTES = 32;
    private const NONCE_BYTES = 12;
    private const TAG_BYTES = 16;

    private readonly string $keyBytes;

    public function __construct(
        #[Autowire('%env(ENCRYPTION_KEY)%')]
        string $key,
    ) {
        if ($key === '') {
            throw new PayloadCipherException('ENCRYPTION_KEY is empty. Provision it via Symfony Secrets or env.');
        }

        $decoded = base64_decode($key, true);
        if ($decoded === false) {
            throw new PayloadCipherException('ENCRYPTION_KEY is not valid base64.');
        }

        if (strlen($decoded) !== self::KEY_BYTES) {
            throw new PayloadCipherException(sprintf(
                'ENCRYPTION_KEY must decode to %d bytes; got %d.',
                self::KEY_BYTES,
                strlen($decoded),
            ));
        }

        $this->keyBytes = $decoded;
    }

    /**
     * Encrypt $plaintext and return base64(nonce || ciphertext || tag).
     */
    public function encrypt(string $plaintext): string
    {
        $nonce = random_bytes(self::NONCE_BYTES);
        $tag = '';

        $ciphertext = openssl_encrypt(
            $plaintext,
            self::CIPHER,
            $this->keyBytes,
            \OPENSSL_RAW_DATA,
            $nonce,
            $tag,
            '',
            self::TAG_BYTES,
        );

        if ($ciphertext === false) {
            throw new PayloadCipherException('openssl_encrypt failed: ' . openssl_error_string());
        }

        return base64_encode($nonce . $ciphertext . $tag);
    }

    /**
     * Decrypt an envelope produced by encrypt(). Throws on any failure.
     */
    public function decrypt(string $envelope): string
    {
        if ($envelope === '') {
            throw new PayloadCipherException('Cannot decrypt empty envelope.');
        }

        $raw = base64_decode($envelope, true);
        if ($raw === false) {
            throw new PayloadCipherException('Envelope is not valid base64.');
        }

        if (strlen($raw) < self::NONCE_BYTES + self::TAG_BYTES) {
            throw new PayloadCipherException('Envelope too short to contain nonce + tag.');
        }

        $nonce = substr($raw, 0, self::NONCE_BYTES);
        $tag = substr($raw, -self::TAG_BYTES);
        $ciphertext = substr($raw, self::NONCE_BYTES, -self::TAG_BYTES);

        $plaintext = openssl_decrypt(
            $ciphertext,
            self::CIPHER,
            $this->keyBytes,
            \OPENSSL_RAW_DATA,
            $nonce,
            $tag,
        );

        if ($plaintext === false) {
            // GCM tag mismatch → bad key, corrupted envelope, or tamper.
            throw new PayloadCipherException('Decryption failed (bad key or tampered envelope).');
        }

        return $plaintext;
    }
}
