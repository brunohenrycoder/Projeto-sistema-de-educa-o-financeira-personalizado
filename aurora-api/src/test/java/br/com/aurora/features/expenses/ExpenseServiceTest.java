package br.com.aurora.features.expenses;

import br.com.aurora.shared.domain.Expense;
import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.FamilyGroup;
import br.com.aurora.shared.domain.FamilyGroupRepository;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import br.com.aurora.shared.error.ValidationException;
import br.com.aurora.shared.security.UsuarioAutenticado;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class ExpenseServiceTest {

    @Autowired
    private ExpenseService expenseService;

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FamilyGroupRepository familyGroupRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("Principal consegue registrar despesa válida")
    void shouldCreateExpenseForPrincipal() {
        User principal = createUser(Role.PRINCIPAL, "principal.expense@aurora.com");
        setAuthenticatedUser(principal);

        ExpenseResponse response = expenseService.createExpense(ExpenseRequest.builder()
                .amount(new BigDecimal("125.50"))
                .expenseDate(LocalDate.now())
                .category("Alimentação")
                .paymentMethod(ExpensePaymentMethod.PIX)
                .description("Mercado")
                .build());

        assertThat(response.getUserId()).isEqualTo(principal.getId());
        assertThat(response.getFamilyGroupId()).isEqualTo(principal.getFamilyGroup().getId());
        assertThat(response.getAmount()).isEqualByComparingTo("125.50");
        assertThat(expenseRepository.findById(response.getId())).isPresent();
    }

    @Test
    @DisplayName("Dependente consegue registrar sua própria despesa")
    void shouldCreateExpenseForDependent() {
        User principal = createUser(Role.PRINCIPAL, "principal2.expense@aurora.com");
        User dependent = createUser(Role.DEPENDENTE, "dependente.expense@aurora.com", principal.getFamilyGroup());
        setAuthenticatedUser(dependent);

        ExpenseResponse response = expenseService.createExpense(ExpenseRequest.builder()
                .amount(new BigDecimal("80.00"))
                .expenseDate(LocalDate.now())
                .category("Transporte")
                .paymentMethod(ExpensePaymentMethod.DINHEIRO)
                .build());

        assertThat(response.getUserId()).isEqualTo(dependent.getId());
        assertThat(response.getFamilyGroupId()).isEqualTo(principal.getFamilyGroup().getId());
    }

    @Test
    @DisplayName("Não permite valor zerado ou negativo")
    void shouldRejectInvalidAmount() {
        User principal = createUser(Role.PRINCIPAL, "principal3.expense@aurora.com");
        setAuthenticatedUser(principal);

        assertThatThrownBy(() -> expenseService.createExpense(ExpenseRequest.builder()
                .amount(BigDecimal.ZERO)
                .expenseDate(LocalDate.now())
                .category("Moradia")
                .paymentMethod(ExpensePaymentMethod.CARTAO_CREDITO)
                .build()))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("maior que zero");
    }

    @Test
    @DisplayName("Dependente não pode consultar despesa de outro membro")
    void shouldBlockDependentFromAccessingOtherMemberExpense() {
        User principal = createUser(Role.PRINCIPAL, "principal4.expense@aurora.com");
        User dependent = createUser(Role.DEPENDENTE, "dependente4.expense@aurora.com", principal.getFamilyGroup());
        User other = createUser(Role.DEPENDENTE, "dependente5.expense@aurora.com", principal.getFamilyGroup());

        Expense otherExpense = expenseRepository.save(Expense.builder()
                .familyGroup(principal.getFamilyGroup())
                .user(other)
                .amount(new BigDecimal("25.00"))
                .expenseDate(LocalDate.now())
                .category("Lazer")
                .paymentMethod(ExpensePaymentMethod.PIX)
                .build());

        setAuthenticatedUser(dependent);

        assertThatThrownBy(() -> expenseService.updateExpense(otherExpense.getId(), ExpenseUpdateRequest.builder()
                .amount(new BigDecimal("50.00"))
                .build()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("Principal consegue listar despesas do grupo")
    void shouldListFamilyExpensesForPrincipal() {
        User principal = createUser(Role.PRINCIPAL, "principal5.expense@aurora.com");
        User dependent = createUser(Role.DEPENDENTE, "dependente6.expense@aurora.com", principal.getFamilyGroup());
        setAuthenticatedUser(principal);

        expenseRepository.save(Expense.builder()
                .familyGroup(principal.getFamilyGroup())
                .user(principal)
                .amount(new BigDecimal("150.00"))
                .expenseDate(LocalDate.now())
                .category("Casa")
                .paymentMethod(ExpensePaymentMethod.TRANSFERENCIA)
                .build());

        expenseRepository.save(Expense.builder()
                .familyGroup(principal.getFamilyGroup())
                .user(dependent)
                .amount(new BigDecimal("40.00"))
                .expenseDate(LocalDate.now())
                .category("Saúde")
                .paymentMethod(ExpensePaymentMethod.DINHEIRO)
                .build());

        assertThat(expenseService.listExpenses(ExpenseFilterRequest.builder().build())).hasSize(2);
    }

    private User createUser(Role role, String email) {
        return createUser(role, email, null);
    }

    private User createUser(Role role, String email, FamilyGroup familyGroup) {
        FamilyGroup group = familyGroup != null ? familyGroup : familyGroupRepository.save(FamilyGroup.builder().build());
        User user = User.builder()
                .familyGroup(group)
                .name(role == Role.PRINCIPAL ? "Principal" : "Dependente")
                .email(email)
                .passwordHash(passwordEncoder.encode("senhaForte123"))
                .role(role)
                .status(UserStatus.ATIVO)
                .emailConfirmed(true)
                .build();
        return userRepository.save(user);
    }

    private void setAuthenticatedUser(User user) {
        UsuarioAutenticado authenticatedUser = UsuarioAutenticado.fromUser(user);
        SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        authenticatedUser,
                        null,
                        authenticatedUser.getAuthorities()
                )
        );
    }
}
