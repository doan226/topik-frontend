package com.topik.topikai.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDate;

@Entity
@Data
public class UserAnswer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private int questionNumber;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "TEXT")
    private String aiFeedbackJson;

    private int score; // 🎯 Cột mới: Lưu điểm số dạng số nguyên để vẽ biểu đồ nhanh

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDate createdAt; // 🎯 Cột mới: Tự động lưu ngày nộp bài (YYYY-MM-DD)
}