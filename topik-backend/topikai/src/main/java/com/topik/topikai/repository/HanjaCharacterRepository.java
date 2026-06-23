package com.topik.topikai.repository;

import com.topik.topikai.entity.HanjaCharacter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HanjaCharacterRepository extends JpaRepository<HanjaCharacter, Long> {

    Optional<HanjaCharacter> findByExternalId(String externalId);

    List<HanjaCharacter> findAllByOrderByReadingAscHanjaCharAsc();
}
