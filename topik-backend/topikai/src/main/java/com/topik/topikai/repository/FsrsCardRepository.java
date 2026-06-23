package com.topik.topikai.repository;

import com.topik.topikai.entity.FsrsCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FsrsCardRepository extends JpaRepository<FsrsCard, Long> {

    List<FsrsCard> findByUserIdOrderByDueAsc(Long userId);

    List<FsrsCard> findByUserIdAndDueLessThanEqualOrderByDueAsc(Long userId, Long dueMs);

    long countByUserIdAndSource(Long userId, String source);

    long countByUserIdAndSourceAndSpecialty(Long userId, String source, String specialty);

    Optional<FsrsCard> findByIdAndUserId(Long id, Long userId);

    Optional<FsrsCard> findByUserIdAndExternalRef(Long userId, String externalRef);
}
