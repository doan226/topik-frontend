package com.topik.topikai.controller;

import com.topik.topikai.entity.PaymentWebhookLog;
import com.topik.topikai.repository.PaymentWebhookLogRepository;
import com.topik.topikai.security.SecurityUtils;
import com.topik.topikai.service.EntitlementService;
import com.topik.topikai.service.PaymentMatch;
import com.topik.topikai.service.SkuPaymentService;
import com.topik.topikai.service.UsageQuotaService;
import com.topik.topikai.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/payment")
public class CassoController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SkuPaymentService skuPaymentService;

    @Autowired
    private EntitlementService entitlementService;

    @Autowired
    private UsageQuotaService usageQuotaService;

    @Autowired
    private PaymentWebhookLogRepository paymentWebhookLogRepository;

    @Value("${casso.secure-token:}")
    private String cassoSecureToken;

    @PostMapping("/casso-webhook")
    public ResponseEntity<?> handleCassoWebhook(
            @RequestHeader(value = "secure-token", required = false) String secureToken,
            @RequestBody Map<String, Object> payload) {

        try {
            String configured = cassoSecureToken != null ? cassoSecureToken.trim() : "";
            if (configured.isEmpty() || secureToken == null || !configured.equals(secureToken.trim())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Sai mã bảo mật bảo vệ hệ thống");
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> transactions = (List<Map<String, Object>>) payload.get("data");

            if (transactions == null || transactions.isEmpty()) {
                return ResponseEntity.ok(Map.of("error", 0, "message", "Không có dữ liệu giao dịch"));
            }

            for (Map<String, Object> tx : transactions) {
                String description = (String) tx.get("description");
                int amount = ((Number) tx.get("amount")).intValue();
                Object txnId = tx.get("id");
                String dedupeKey = "casso:" + (txnId != null ? txnId : description + ":" + amount);

                if (paymentWebhookLogRepository.existsByDedupeKey(dedupeKey)) {
                    continue;
                }

                Optional<PaymentMatch> match = skuPaymentService.processPayment(description, amount);

                if (match.isPresent()) {
                    PaymentWebhookLog log = new PaymentWebhookLog();
                    log.setDedupeKey(dedupeKey);
                    log.setSource("casso");
                    log.setAmount(amount);
                    log.setUserId(match.get().userId());
                    log.setSku(match.get().skuCode());
                    log.setDescriptionSnippet(description != null && description.length() > 120
                            ? description.substring(0, 120) : description);
                    paymentWebhookLogRepository.save(log);
                }
            }

            return ResponseEntity.ok(Map.of("error", 0, "message", "Đã xử lý Webhook hoàn tất"));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Lỗi hệ thống khi xử lý Webhook");
        }
    }

    @GetMapping("/check-vip/{userId}")
    public ResponseEntity<?> checkVipStatus(@PathVariable Long userId) {
        SecurityUtils.assertUserAccess(userId);
        if (userRepository.findById(userId).isEmpty()) {
            return ResponseEntity.badRequest().body("Không tìm thấy người dùng");
        }
        int used = usageQuotaService.countGradingToday(userId);
        Map<String, Object> snap = entitlementService.buildEntitlementSnapshot(userId, used);
        snap.put("role", snap.get("hasWriting").equals(Boolean.TRUE) ? "PREMIUM_USER" : snap.get("role"));
        return ResponseEntity.ok(snap);
    }
}
