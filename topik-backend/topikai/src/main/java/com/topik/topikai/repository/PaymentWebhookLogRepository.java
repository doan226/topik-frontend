package com.topik.topikai.repository;

import com.topik.topikai.entity.PaymentWebhookLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentWebhookLogRepository extends JpaRepository<PaymentWebhookLog, Long> {
    boolean existsByDedupeKey(String dedupeKey);
}
