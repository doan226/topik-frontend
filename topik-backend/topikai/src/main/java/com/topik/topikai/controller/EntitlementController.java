package com.topik.topikai.controller;

import com.topik.topikai.security.SecurityUtils;
import com.topik.topikai.service.EntitlementService;
import com.topik.topikai.service.UsageQuotaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class EntitlementController {

    @Autowired
    private EntitlementService entitlementService;

    @Autowired
    private UsageQuotaService usageQuotaService;

    @GetMapping("/entitlements/{userId}")
    public ResponseEntity<Map<String, Object>> getEntitlements(@PathVariable Long userId) {
        SecurityUtils.assertUserAccess(userId);
        int used = usageQuotaService.countGradingToday(userId);
        return ResponseEntity.ok(entitlementService.buildEntitlementSnapshot(userId, used));
    }

    @GetMapping("/products/skus")
    public ResponseEntity<List<Map<String, Object>>> listProductSkus() {
        return ResponseEntity.ok(List.of(
                sku("TOPIKVIET", EntitlementService.PRICE_WRITING_90D, "Viết 90 ngày", "Chấm AI 15 lượt/ngày · Câu 51–54"),
                sku("TOPIKVIP", EntitlementService.PRICE_WRITING_LIFE, "Viết trọn đời", "Chấm AI 20 lượt/ngày · Câu 51–54"),
                sku("TOPIKI", EntitlementService.PRICE_TOPIK1, "TOPIK I Pack", "~20 bộ đề cấp 1&2 + giải thích"),
                sku("TOPIKHANJA", EntitlementService.PRICE_HANJA, "Hán Hàn Pack", "90 từ + intermediate · SRS unlimited"),
                sku("TOPIKALL", EntitlementService.PRICE_ALLIN, "All-in", "Viết + TOPIK I + Hán Hàn")
        ));
    }

    private static Map<String, Object> sku(String code, int price, String title, String subtitle) {
        return Map.of(
                "code", code,
                "price", price,
                "title", title,
                "subtitle", subtitle
        );
    }
}
