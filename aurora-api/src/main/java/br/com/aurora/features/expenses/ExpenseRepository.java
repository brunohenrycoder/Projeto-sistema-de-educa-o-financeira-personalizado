package br.com.aurora.features.expenses;

import br.com.aurora.shared.domain.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, UUID> {
    List<Expense> findByFamilyGroupIdOrderByExpenseDateDesc(UUID familyGroupId);
    List<Expense> findByFamilyGroupIdAndUserIdOrderByExpenseDateDesc(UUID familyGroupId, UUID userId);
    Optional<Expense> findByIdAndFamilyGroupId(UUID id, UUID familyGroupId);
}
