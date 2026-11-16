package br.com.aurora.features.notifications.listnotifications;

import br.com.aurora.shared.domain.NotificationType;

import java.time.LocalDateTime;
import java.util.List;

public record ListNotificationsResponse(List<NotificationItem> notifications) {

    public record NotificationItem(
            NotificationType type,
            String description,
            LocalDateTime createdAt
    ) {
    }
}
