package br.com.aurora.features.auth.login;

import br.com.aurora.shared.domain.LoginAttempt;
import br.com.aurora.shared.domain.LoginAttemptRepository;
import br.com.aurora.shared.security.TokenHashUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest
@AutoConfigureMockMvc
class LoginAttemptConcurrencyTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private LoginAttemptRepository loginAttemptRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void concurrentFailuresCannotExceedTheConfiguredAttemptLimit() throws Exception {
        String email = "concurrent-" + UUID.randomUUID() + "@example.com";
        String emailHash = TokenHashUtils.hashIdentifier(email);
        int requests = 8;
        ExecutorService executor = Executors.newFixedThreadPool(requests);
        CountDownLatch ready = new CountDownLatch(requests);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Integer>> results = new ArrayList<>();

        try {
            for (int i = 0; i < requests; i++) {
                results.add(executor.submit(() -> {
                    ready.countDown();
                    start.await();
                    MvcResult result = mockMvc.perform(post("/api/auth/login")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(objectMapper.writeValueAsString(
                                            new LoginRequest(email, "senha-incorreta")
                                    )))
                            .andReturn();
                    return result.getResponse().getStatus();
                }));
            }

            ready.await();
            start.countDown();

            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> result : results) {
                statuses.add(result.get());
            }

            LoginAttempt attempts = loginAttemptRepository.findById(emailHash).orElseThrow();
            assertThat(attempts.getFailedAttempts()).isEqualTo(5);
            assertThat(attempts.getLockedUntil()).isNotNull();
            assertThat(statuses.stream().filter(status -> status == 401).count()).isEqualTo(4);
            assertThat(statuses.stream().filter(status -> status == 429).count()).isEqualTo(4);
        } finally {
            start.countDown();
            executor.shutdownNow();
            loginAttemptRepository.deleteById(emailHash);
        }
    }
}
