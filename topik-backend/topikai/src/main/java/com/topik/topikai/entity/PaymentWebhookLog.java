package com.topik.topikai.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "payment_webhook_log", uniqueConstraints = @UniqueConstraint(columnNames = "dedupe_key"))
public class PaymentWebhookLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dedupe_key", nullable = false, length = 255)
    private String dedupeKey;

    @Column(name = "source", nullable = false, length = 32)
    private String source;

    @Column(name = "amount")
    private Integer amount;

    @Column(name = "description_snippet", length = 120)
    private String descriptionSnippet;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "sku", length = 32)
    private String sku;

    @CreationTimestamp
    @Column(name = "processed_at", updatable = false)
    private LocalDateTime processedAt;
}
