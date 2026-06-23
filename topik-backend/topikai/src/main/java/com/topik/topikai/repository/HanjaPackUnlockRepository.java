package com.topik.topikai.repository;

import com.topik.topikai.entity.HanjaPackUnlock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HanjaPackUnlockRepository extends JpaRepository<HanjaPackUnlock, Long> {

    List<HanjaPackUnlock> findByUserId(Long userId);

    Optional<HanjaPackUnlock> findByUserIdAndPackId(Long userId, String packId);

    boolean existsByUserIdAndPackId(Long userId, String packId);
}
