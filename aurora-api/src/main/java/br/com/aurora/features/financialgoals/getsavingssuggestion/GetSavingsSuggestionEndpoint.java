package br.com.aurora.features.financialgoals.getsavingssuggestion;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/financial-goals/savings-suggestion", "/financial-goals/savings-suggestion"})
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class GetSavingsSuggestionEndpoint {

    private final GetSavingsSuggestionService service;

    @GetMapping
    public ResponseEntity<GetSavingsSuggestionResponse> get() {
        var suggestion = service.get();
        if (suggestion.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(suggestion.get());
    }
}
