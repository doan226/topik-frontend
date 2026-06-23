package com.topik.topikai.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
public class JwtStartupValidator implements ApplicationRunner {

    private final JwtProperties jwtProperties;
    private final Environment environment;

    public JwtStartupValidator(JwtProperties jwtProperties, Environment environment) {
        this.jwtProperties = jwtProperties;
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        String secret = jwtProperties.getSecret();
        if (secret == null || secret.trim().length() < 32) {
            throw new IllegalStateException("JWT_SECRET must be set to at least 32 characters in production");
        }
        if (environment.getProperty("admin.api.key", "").isBlank()) {
            throw new IllegalStateException("ADMIN_API_KEY must be set in production");
        }
    }
}
