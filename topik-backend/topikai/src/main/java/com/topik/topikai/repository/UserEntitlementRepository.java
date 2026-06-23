package com.topik.topikai.repository;

import com.topik.topikai.entity.EntitlementSku;
import com.topik.topikai.entity.UserEntitlement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserEntitlementRepository extends JpaRepository<UserEntitlement, Long> {

    List<UserEntitlement> findByUserId(Long userId);

    Optional<UserEntitlement> findByUserIdAndSku(Long userId, EntitlementSku sku);
}
