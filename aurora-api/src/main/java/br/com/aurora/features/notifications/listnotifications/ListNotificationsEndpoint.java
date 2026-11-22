package br.com.aurora.features.notifications.listnotifications;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/notifications", "/notifications"})
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class ListNotificationsEndpoint {

    private final ListNotificationsService service;

    @GetMapping
    public ListNotificationsResponse list() {
        return service.list();
    }
}
