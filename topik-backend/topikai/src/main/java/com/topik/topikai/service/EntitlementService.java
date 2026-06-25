package com.topik.topikai.service;

import com.topik.topikai.entity.EntitlementSku;
import com.topik.topikai.entity.Role;
import com.topik.topikai.entity.UserEntitlement;
import com.topik.topikai.repository.UserEntitlementRepository;
import com.topik.topikai.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class EntitlementService {

    public static final int FREE_DAILY_GRADING = 2;
    public static final int WRITING_90D_DAILY_GRADING = 15;
    public static final int WRITING_LIFE_DAILY_GRADING = 20;
    public static final int FREE_DAILY_AI_EXPLAIN = 3;
    public static final int TOPIK1_DAILY_AI_EXPLAIN = 5;

    public static final int PRICE_WRITING_90D = 89_000;
    public static final int PRICE_WRITING_LIFE = 129_000;
    public static final int PRICE_TOPIK1 = 99_000;
    public static final int PRICE_HANJA = 79_000;
    public static final int PRICE_ALLIN = 189_000;
    public static final int PRICE_LEGACY_VIP = 50_000;

    public static final List<String> HANJA_ADVANCED_PACK_IDS = List.of(
            "topik-premium-90",
            "topik-intermediate"
    );

    @Autowired
    private UserEntitlementRepository userEntitlementRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HanjaPackService hanjaPackService;

    public boolean hasLegacyPremium(Long userId) {
        return userRepository.findById(userId)
                .map(u -> u.getRole() == Role.PREMIUM_USER)
                .orElse(false);
    }

    public boolean hasActiveEntitlement(Long userId, EntitlementSku sku) {
        Optional<UserEntitlement> row = userEntitlementRepository.findByUserIdAndSku(userId, sku);
        if (row.isEmpty()) return false;
        LocalDateTime exp = row.get().getExpiresAt();
        return exp == null || exp.isAfter(LocalDateTime.now());
    }

    public boolean hasAllIn(Long userId) {
        return hasActiveEntitlement(userId, EntitlementSku.ALLIN);
    }

    public boolean hasWriting(Long userId) {
        if (hasLegacyPremium(userId)) return true;
        if (hasAllIn(userId)) return true;
        if (hasActiveEntitlement(userId, EntitlementSku.WRITING_LIFE)) return true;
        return hasActiveEntitlement(userId, EntitlementSku.WRITING_90D);
    }

    public boolean hasHanja(Long userId) {
        if (hasLegacyPremium(userId)) return true;
        if (hasAllIn(userId)) return true;
        return hasActiveEntitlement(userId, EntitlementSku.HANJA);
    }

    public boolean hasTopik1(Long userId) {
        if (hasLegacyPremium(userId)) return true;
        if (hasAllIn(userId)) return true;
        return hasActiveEntitlement(userId, EntitlementSku.TOPIK1);
    }

    /** @deprecated use hasWriting — kept for gradual migration */
    public boolean isPremium(Long userId) {
        return hasWriting(userId);
    }

    public int getDailyGradingLimit(Long userId) {
        if (!hasWriting(userId)) return FREE_DAILY_GRADING;
        if (hasAllIn(userId) || hasActiveEntitlement(userId, EntitlementSku.WRITING_LIFE) || hasLegacyPremium(userId)) {
            return WRITING_LIFE_DAILY_GRADING;
        }
        if (hasActiveEntitlement(userId, EntitlementSku.WRITING_90D)) {
            return WRITING_90D_DAILY_GRADING;
        }
        return FREE_DAILY_GRADING;
    }

    public int getDailyAiExplainLimit(Long userId) {
        if (hasWriting(userId) || hasAllIn(userId)) return -1;
        if (hasTopik1(userId)) return TOPIK1_DAILY_AI_EXPLAIN;
        return FREE_DAILY_AI_EXPLAIN;
    }

    public LocalDateTime getWritingExpiresAt(Long userId) {
        if (hasAllIn(userId) || hasActiveEntitlement(userId, EntitlementSku.WRITING_LIFE) || hasLegacyPremium(userId)) {
            return null;
        }
        return userEntitlementRepository.findByUserIdAndSku(userId, EntitlementSku.WRITING_90D)
                .map(UserEntitlement::getExpiresAt)
                .orElse(null);
    }

    public List<UserEntitlement> listEntitlements(Long userId) {
        return userEntitlementRepository.findByUserId(userId);
    }

    @Transactional
    public void grantEntitlement(Long userId, EntitlementSku sku, LocalDateTime expiresAt) {
        UserEntitlement ent = userEntitlementRepository.findByUserIdAndSku(userId, sku)
                .orElseGet(() -> {
                    UserEntitlement created = new UserEntitlement();
                    created.setUserId(userId);
                    created.setSku(sku);
                    return created;
                });
        ent.setExpiresAt(expiresAt);
        userEntitlementRepository.save(ent);

        if (sku == EntitlementSku.HANJA || sku == EntitlementSku.ALLIN) {
            unlockHanjaAdvancedPacks(userId);
        }
    }

    @Transactional
    public void grantAllIn(Long userId) {
        grantEntitlement(userId, EntitlementSku.ALLIN, null);
        unlockHanjaAdvancedPacks(userId);
        promoteToPremium(userId);
    }

    private void promoteToPremium(Long userId) {
        userRepository.findById(userId).ifPresent(user -> {
            if (user.getRole() != Role.PREMIUM_USER) {
                user.setRole(Role.PREMIUM_USER);
                userRepository.save(user);
            }
        });
    }

    @Transactional
    public void grantWriting90Days(Long userId) {
        grantEntitlement(userId, EntitlementSku.WRITING_90D, LocalDateTime.now().plusDays(90));
    }

    @Transactional
    public void grantWritingLife(Long userId) {
        // Goi le: chi mo Viet qua SKU, tai khoan giu muc binh thuong (khong gan PREMIUM_USER)
        grantEntitlement(userId, EntitlementSku.WRITING_LIFE, null);
    }

    @Transactional
    public void grantTopik1(Long userId) {
        grantEntitlement(userId, EntitlementSku.TOPIK1, null);
    }

    @Transactional
    public void grantHanja(Long userId) {
        grantEntitlement(userId, EntitlementSku.HANJA, null);
        unlockHanjaAdvancedPacks(userId);
    }

    @Transactional
    public void grantLegacyPremium(Long userId) {
        grantWritingLife(userId);
    }

    private void unlockHanjaAdvancedPacks(Long userId) {
        for (String packId : HANJA_ADVANCED_PACK_IDS) {
            hanjaPackService.unlockPack(userId, packId);
        }
    }

    public Map<String, Object> buildEntitlementSnapshot(Long userId, int gradingUsedToday) {
        Map<String, Object> snap = new LinkedHashMap<>();
        boolean writing = hasWriting(userId);
        boolean hanja = hasHanja(userId);
        boolean topik1 = hasTopik1(userId);
        boolean allIn = hasAllIn(userId);
        int gradingLimit = getDailyGradingLimit(userId);

        snap.put("hasWriting", writing);
        snap.put("hasHanja", hanja);
        snap.put("hasTopik1", topik1);
        snap.put("allIn", allIn);
        snap.put("isPremium", writing);
        snap.put("writingExpiresAt", getWritingExpiresAt(userId));
        snap.put("gradingLimitDaily", gradingLimit);
        snap.put("gradingUsedToday", gradingUsedToday);
        snap.put("canGrade", gradingLimit < 0 || gradingUsedToday < gradingLimit);
        snap.put("aiExplainLimitDaily", getDailyAiExplainLimit(userId));
        snap.put("role", userRepository.findById(userId).map(u -> u.getRole().name()).orElse("FREE_USER"));
        snap.put("entitlements", listEntitlements(userId).stream().map(this::toDto).toList());
        return snap;
    }

    private Map<String, Object> toDto(UserEntitlement e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("sku", e.getSku().name());
        m.put("expiresAt", e.getExpiresAt());
        m.put("purchasedAt", e.getPurchasedAt());
        return m;
    }
}
