package com.topik.topikai.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "hanja_character")
@Data
public class HanjaCharacter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Stable slug from hanja-bank.json id field */
    @Column(unique = true, nullable = false)
    private String externalId;

    @Column(name = "hanja_char", nullable = false, length = 8)
    private String hanjaChar;

    @Column(nullable = false, length = 16)
    private String reading;

    private String hanViet;

    private String meaningKo;

    private String meaningVi;

    @Column(columnDefinition = "TEXT")
    private String compoundsJson;

    @Column(columnDefinition = "TEXT")
    private String topicsJson;

    private String source;

    private String verified;
}
