package com.topik.topikai.controller;

import com.topik.topikai.entity.EntitlementSku;
import com.topik.topikai.service.EntitlementService;
import com.topik.topikai.service.TestUserSeedService;
import com.topik.topikai.service.UsageQuotaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminMaintenanceController {

    private final TestUserSeedService testUserSeedService;
    private final EntitlementService entitlementService;
    private final UsageQuotaService usageQuotaService;

    public AdminMaintenanceController(
            TestUserSeedService testUserSeedService,
            EntitlementService entitlementService,
            UsageQuotaService usageQuotaService) {
        this.testUserSeedService = testUserSeedService;
        this.entitlementService = entitlementService;
        this.usageQuotaService = usageQuotaService;
    }

    @PostMapping("/seed-test-users")
    public Map<String, Object> seedTestUsers() {
        return testUserSeedService.seedTestUsers();
    }

    /**
     * Cap goi thu cong cho mot user. Bao ve boi AdminApiKeyFilter (route /api/v1/admin/**).
     * Body: { "userId": <long>, "sku": "ALLIN|TOPIK1|HANJA|WRITING_90D|WRITING_LIFE" }
     */
    @PostMapping("/grant")
    public ResponseEntity<?> grant(@RequestBody Map<String, Object> body) {
        Object userIdRaw = body.get("userId");
        Object skuRaw = body.get("sku");
        if (userIdRaw == null || skuRaw == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Thiếu userId hoặc sku"));
        }

        long userId;
        try {
            userId = Long.parseLong(String.valueOf(userIdRaw).trim());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "userId không hợp lệ"));
        }

        EntitlementSku sku;
        try {
            sku = EntitlementSku.valueOf(String.valueOf(skuRaw).trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "sku không hợp lệ",
                    "allowed", new String[]{"ALLIN", "TOPIK1", "HANJA", "WRITING_90D", "WRITING_LIFE"}
            ));
        }

        switch (sku) {
            case ALLIN -> entitlementService.grantAllIn(userId);
            case TOPIK1 -> entitlementService.grantTopik1(userId);
            case HANJA -> entitlementService.grantHanja(userId);
            case WRITING_90D -> entitlementService.grantWriting90Days(userId);
            case WRITING_LIFE -> entitlementService.grantWritingLife(userId);
        }

        int used = usageQuotaService.countGradingToday(userId);
        return ResponseEntity.ok(Map.of(
                "granted", sku.name(),
                "userId", userId,
                "entitlements", entitlementService.buildEntitlementSnapshot(userId, used)
        ));
    }
}
