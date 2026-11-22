package br.com.aurora.features.reportsanalytics;

import br.com.aurora.features.expenses.ExpenseServiceTestSupport;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.security.UsuarioAutenticado;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ReportsAnalyticsEndpointTest extends ExpenseServiceTestSupport {

    private static final String PATTERNS = "/api/reports-analytics/patterns";
    private static final String VARIATIONS = "/api/reports-analytics/category-variations";

    @Autowired private MockMvc mockMvc;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void monthlyAnalysisRequiresAndValidatesMonthParameter() throws Exception {
        User principal = createUser(Role.PRINCIPAL, "reports-endpoint-owner@aurora.com", null);

        for (String endpoint : List.of(PATTERNS, VARIATIONS)) {
            mockMvc.perform(get(endpoint).with(user(UsuarioAutenticado.fromUser(principal))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.mensagens[0]").value(org.hamcrest.Matchers.containsString("obrigatório")));

            for (String invalidMonth : List.of("2026-13", "2026-2", "0000-11", "texto")) {
                mockMvc.perform(get(endpoint)
                                .param("month", invalidMonth)
                                .with(user(UsuarioAutenticado.fromUser(principal))))
                        .andExpect(status().isBadRequest())
                        .andExpect(jsonPath("$.status").value(400));
            }

            mockMvc.perform(get(endpoint)
                            .param("month", "2026-11")
                            .with(user(UsuarioAutenticado.fromUser(principal))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.period").value("2026-11"));
        }
    }

    @Test
    void everyReportEndpointIsRestrictedToThePrincipal() throws Exception {
        User principal = createUser(Role.PRINCIPAL, "reports-auth-owner@aurora.com", null);
        User dependent = createUser(Role.DEPENDENTE, "reports-auth-dependent@aurora.com", principal.getFamilyGroup());
        List<String> endpoints = List.of(
                "/api/reports-analytics/expenses/by-category",
                "/api/reports-analytics/expenses/by-member",
                PATTERNS,
                VARIATIONS
        );

        for (String endpoint : endpoints) {
            var principalRequest = get(endpoint).with(user(UsuarioAutenticado.fromUser(principal)));
            if (endpoint.equals(PATTERNS) || endpoint.equals(VARIATIONS)) {
                principalRequest = get(endpoint).param("month", "2026-11")
                        .with(user(UsuarioAutenticado.fromUser(principal)));
            }
            mockMvc.perform(principalRequest).andExpect(status().isOk());

            var dependentRequest = get(endpoint).with(user(UsuarioAutenticado.fromUser(dependent)));
            if (endpoint.equals(PATTERNS) || endpoint.equals(VARIATIONS)) {
                dependentRequest = get(endpoint).param("month", "2026-11")
                        .with(user(UsuarioAutenticado.fromUser(dependent)));
            }
            mockMvc.perform(dependentRequest)
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));

            var anonymousRequest = get(endpoint);
            if (endpoint.equals(PATTERNS) || endpoint.equals(VARIATIONS)) {
                anonymousRequest = get(endpoint).param("month", "2026-11");
            }
            mockMvc.perform(anonymousRequest)
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));
        }
    }

    @Test
    void expenseReportRejectsInvalidFilters() throws Exception {
        User principal = createUser(Role.PRINCIPAL, "reports-filter-owner@aurora.com", null);
        var principalRequest = user(UsuarioAutenticado.fromUser(principal));

        mockMvc.perform(get("/api/reports-analytics/expenses/by-category")
                        .param("startDate", "invalid-date")
                        .with(principalRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        mockMvc.perform(get("/api/reports-analytics/expenses/by-member")
                        .param("memberId", "not-a-uuid")
                        .with(principalRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        mockMvc.perform(get("/api/reports-analytics/expenses/by-category")
                        .param("startDate", "2026-06-30")
                        .param("endDate", "2026-06-01")
                        .with(principalRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }
}
