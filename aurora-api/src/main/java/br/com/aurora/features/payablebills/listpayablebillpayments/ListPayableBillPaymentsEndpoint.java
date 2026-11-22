package br.com.aurora.features.payablebills.listpayablebillpayments;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping({"/api/payable-bills", "/payable-bills"})
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class ListPayableBillPaymentsEndpoint {

    private final ListPayableBillPaymentsService service;

    @GetMapping("/{billId}/payments")
    public ListPayableBillPaymentsResponse list(@PathVariable UUID billId) {
        return service.list(billId);
    }
}
