package com.topik.topikai.controller;

import com.topik.topikai.service.TestUserSeedService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminMaintenanceController {

    private final TestUserSeedService testUserSeedService;

    public AdminMaintenanceController(TestUserSeedService testUserSeedService) {
        this.testUserSeedService = testUserSeedService;
    }

    @PostMapping("/seed-test-users")
    public Map<String, Object> seedTestUsers() {
        return testUserSeedService.seedTestUsers();
    }
}
