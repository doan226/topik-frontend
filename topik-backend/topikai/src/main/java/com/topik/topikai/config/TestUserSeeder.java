package com.topik.topikai.config;

import com.topik.topikai.service.TestUserSeedService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Tài khoản test: A / A1 — mật khẩu 1 (FREE vs PREMIUM).
 * Bật bằng seed.test-users=true hoặc SEED_TEST_USERS=true
 */
@Component
@ConditionalOnProperty(name = "seed.test-users", havingValue = "true")
public class TestUserSeeder implements ApplicationRunner {

    private final TestUserSeedService testUserSeedService;

    public TestUserSeeder(TestUserSeedService testUserSeedService) {
        this.testUserSeedService = testUserSeedService;
    }

    @Override
    public void run(ApplicationArguments args) {
        testUserSeedService.seedTestUsers();
        System.out.println("[TestUserSeeder] A / A1 (password=1) — FREE_USER & PREMIUM_USER");
    }
}
