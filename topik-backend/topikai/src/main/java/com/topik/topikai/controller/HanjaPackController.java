package com.topik.topikai.controller;

import com.topik.topikai.security.SecurityUtils;
import com.topik.topikai.service.EntitlementService;
import com.topik.topikai.service.HanjaCharacterService;
import com.topik.topikai.service.HanjaPackService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/hanja")
public class HanjaPackController {

    @Autowired
    private HanjaPackService hanjaPackService;

    @Autowired
    private HanjaCharacterService hanjaCharacterService;

    @GetMapping("/characters")
    public ResponseEntity<?> listCharacters() {
        return ResponseEntity.ok(hanjaCharacterService.listAll());
    }

    @GetMapping("/characters/{externalId}")
    public ResponseEntity<?> getCharacter(@PathVariable String externalId) {
        return hanjaCharacterService.getByExternalId(externalId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats() {
        Map<String, Object> body = new HashMap<>();
        body.put("characterCount", hanjaCharacterService.count());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/unlocks/{userId}")
    public ResponseEntity<Map<String, Object>> getUnlocks(@PathVariable Long userId) {
        SecurityUtils.assertUserAccess(userId);
        Map<String, Object> body = new HashMap<>();
        body.put("userId", userId);
        body.put("packIds", hanjaPackService.getUnlockedPackIds(userId));
        return ResponseEntity.ok(body);
    }

    @GetMapping("/pack-skus")
    public ResponseEntity<?> listSkus() {
        return ResponseEntity.ok(Map.of(
                "price", HanjaPackService.HANJA_PACK_PRICE,
                "code", "TOPIKHANJA",
                "packIds", EntitlementService.HANJA_ADVANCED_PACK_IDS
        ));
    }
}
