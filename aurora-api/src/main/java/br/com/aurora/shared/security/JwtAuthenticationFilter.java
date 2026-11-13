package br.com.aurora.shared.security;

import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import br.com.aurora.shared.domain.AuthSessionRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenService jwtTokenService;
    private final UserRepository userRepository;
    private final AuthSessionRepository authSessionRepository;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);
        try {
            final String userEmail = jwtTokenService.extractEmail(jwt);
            final UUID sessionId = jwtTokenService.extractSessionId(jwt);

            if (userEmail != null && sessionId != null
                    && SecurityContextHolder.getContext().getAuthentication() == null) {
                userRepository.findByEmailIgnoreCase(userEmail).ifPresent(user -> {
                    if (user.getStatus() == UserStatus.ATIVO
                            && user.isEmailConfirmed()
                            && jwtTokenService.isTokenValid(jwt, user.getEmail())
                            && authSessionRepository.existsByIdAndUserIdAndRevokedAtIsNullAndExpiresAtAfter(
                                    sessionId, user.getId(), LocalDateTime.now()
                            )) {
                        UsuarioAutenticado usuarioAutenticado = UsuarioAutenticado.fromUser(user, sessionId);
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                usuarioAutenticado,
                                null,
                                usuarioAutenticado.getAuthorities()
                        );
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    }
                });
            }
        } catch (Exception e) {
            log.debug("Token JWT inválido ou sessão não ativa.");
        }

        filterChain.doFilter(request, response);
    }
}
