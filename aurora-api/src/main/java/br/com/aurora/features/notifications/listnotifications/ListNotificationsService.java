package br.com.aurora.features.notifications.listnotifications;

import br.com.aurora.shared.domain.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ListNotificationsService {

    private final NotificationsAccess access;
    private final NotificationRepository notificationRepository;

    @Transactional(readOnly = true)
    public ListNotificationsResponse list() {
        var principal = access.requirePrincipal();
        var items = notificationRepository
                .findByFamilyGroupIdOrderByCreatedAtDesc(principal.getFamilyGroup().getId())
                .stream()
                .map(notification -> new ListNotificationsResponse.NotificationItem(
                        notification.getType(),
                        notification.getDescription(),
                        notification.getCreatedAt()
                ))
                .toList();
        return new ListNotificationsResponse(items);
    }
}
