<?php

declare(strict_types=1);

namespace App\Security;

/**
 * Thrown by PayloadCipher when encryption or decryption fails
 * (invalid key, malformed envelope, authentication-tag mismatch…).
 */
final class PayloadCipherException extends \RuntimeException
{
}
