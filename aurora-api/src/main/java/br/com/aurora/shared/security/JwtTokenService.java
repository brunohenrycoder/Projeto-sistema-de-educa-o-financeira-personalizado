package br.com.aurora.shared.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;
import java.util.function.Function;

@Service
public class JwtTokenService {

    @Value("${security.jwt.secret:aurora-api-secret-key-must-be-at-least-256-bits-long-for-hmac-sha-security}")
    private String secret;

    @Value("${security.jwt.expiration:86400000}")
    private long expirationMs;

    public String generateToken(UsuarioAutenticado usuario, UUID sessionId) {
        Date issuedAt = new Date();
        return generateToken(usuario, sessionId, issuedAt, new Date(issuedAt.getTime() + expirationMs));
    }

    public String generateToken(UsuarioAutenticado usuario, UUID sessionId, Date issuedAt, Date expiresAt) {
        return Jwts.builder()
                .subject(usuario.getUsername())
                .claim("userId", usuario.getId().toString())
                .claim("familyGroupId", usuario.getFamilyGroupId().toString())
                .claim("role", usuario.getRole().name())
                .claim("sessionId", sessionId.toString())
                .issuedAt(issuedAt)
                .expiration(expiresAt)
                .signWith(getSigningKey())
                .compact();
    }

    public String extractEmail(String token) {
        return extractClaim(token, claims -> claims.getSubject());
    }

    public UUID extractUserId(String token) {
        String userIdStr = extractClaim(token, claims -> claims.get("userId", String.class));
        return userIdStr != null ? UUID.fromString(userIdStr) : null;
    }

    public UUID extractFamilyGroupId(String token) {
        String familyGroupIdStr = extractClaim(token, claims -> claims.get("familyGroupId", String.class));
        return familyGroupIdStr != null ? UUID.fromString(familyGroupIdStr) : null;
    }

    public String extractRole(String token) {
        return extractClaim(token, claims -> claims.get("role", String.class));
    }

    public UUID extractSessionId(String token) {
        String sessionId = extractClaim(token, claims -> claims.get("sessionId", String.class));
        return sessionId != null ? UUID.fromString(sessionId) : null;
    }

    public long getExpirationMs() {
        return expirationMs;
    }

    public boolean isTokenValid(String token, String expectedEmail) {
        try {
            String email = extractEmail(token);
            return email != null && email.equalsIgnoreCase(expectedEmail) && !isTokenExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, claims -> claims.getExpiration());
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
