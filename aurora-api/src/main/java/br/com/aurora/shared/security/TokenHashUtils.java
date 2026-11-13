package br.com.aurora.shared.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

public final class TokenHashUtils {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private TokenHashUtils() {
    }

    public static String generateRandomToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String hashToken(String rawToken) {
        return sha256(rawToken);
    }

    public static String hashIdentifier(String identifier) {
        return sha256(identifier);
    }

    private static String sha256(String value) {
        if (value == null) {
            throw new IllegalArgumentException("Valor não pode ser nulo.");
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedHash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(encodedHash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Algoritmo SHA-256 indisponível.", e);
        }
    }
}
