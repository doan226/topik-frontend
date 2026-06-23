package com.topik.topikai.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Data
@Table(
        name = "hanja_pack_unlock",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "pack_id"})
)
public class HanjaPackUnlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "pack_id", nullable = false, length = 80)
    private String packId;

    @CreationTimestamp
    @Column(name = "unlocked_at", updatable = false)
    private LocalDateTime unlockedAt;
}
