package com.topik.topikai.service;

import com.topik.topikai.entity.User;
import com.topik.topikai.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SkuPaymentService {

    private static final Pattern USER_ID_PATTERN = Pattern.compile("(\\d+)");

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntitlementService entitlementService;

    /**
     * Process Casso transfer by keyword + amount. Returns match info when applied.
     */
    @Transactional
    public Optional<PaymentMatch> processPayment(String description, int amount) {
        if (description == null || description.isBlank()) return Optional.empty();
        String upper = description.toUpperCase();

        if (upper.contains("TOPIKALL") && amount >= EntitlementService.PRICE_ALLIN) {
            return apply(upper, "TOPIKALL", userId -> entitlementService.grantAllIn(userId));
        }
        if (upper.contains("TOPIKVIET") && amount >= EntitlementService.PRICE_WRITING_90D) {
            return apply(upper, "TOPIKVIET", userId -> entitlementService.grantWriting90Days(userId));
        }
        if (upper.contains("TOPIKI") && !upper.contains("TOPIKALL") && amount >= EntitlementService.PRICE_TOPIK1) {
            return apply(upper, "TOPIKI", userId -> entitlementService.grantTopik1(userId));
        }
        if (upper.contains("TOPIKHANJA") && amount >= EntitlementService.PRICE_HANJA) {
            return apply(upper, "TOPIKHANJA", userId -> entitlementService.grantHanja(userId));
        }
        if (upper.contains("TOPIKVIP") && amount >= EntitlementService.PRICE_WRITING_LIFE) {
            return apply(upper, "TOPIKVIP", userId -> entitlementService.grantWritingLife(userId));
        }
        if (upper.contains("TOPIKVIP") && amount >= EntitlementService.PRICE_LEGACY_VIP) {
            return apply(upper, "TOPIKVIP", userId -> entitlementService.grantLegacyPremium(userId));
        }
        return Optional.empty();
    }

    private Optional<PaymentMatch> apply(String upperDescription, String keyword, java.util.function.Consumer<Long> action) {
        Long userId = extractUserId(upperDescription, keyword);
        if (userId == null) return Optional.empty();
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return Optional.empty();
        action.accept(userId);
        return Optional.of(new PaymentMatch(userId, keyword));
    }

    static Long extractUserId(String upperDescription, String keyword) {
        String[] parts = upperDescription.split(keyword);
        if (parts.length < 2) return null;
        Matcher m = USER_ID_PATTERN.matcher(parts[1]);
        if (m.find()) {
            try {
                return Long.parseLong(m.group(1));
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}
