package com.topik.topikai.config;

import com.topik.topikai.security.JwtAuthFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final AdminApiKeyFilter adminApiKeyFilter;
    private final RateLimitFilter rateLimitFilter;
    private final SecurityHeadersFilter securityHeadersFilter;
    private final Environment environment;

    @Value("${cors.allowed-origin-patterns:}")
    private String corsAllowedOriginPatterns;

    public SecurityConfig(
            JwtAuthFilter jwtAuthFilter,
            AdminApiKeyFilter adminApiKeyFilter,
            RateLimitFilter rateLimitFilter,
            SecurityHeadersFilter securityHeadersFilter,
            Environment environment) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.adminApiKeyFilter = adminApiKeyFilter;
        this.rateLimitFilter = rateLimitFilter;
        this.securityHeadersFilter = securityHeadersFilter;
        this.environment = environment;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/health").permitAll()
                        .requestMatchers("/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/verify").permitAll()
                        .requestMatchers("/api/v1/payment/casso-webhook", "/api/v1/payment/vnpay-return").permitAll()
                        .requestMatchers("/api/v1/questions/**").permitAll()
                        .requestMatchers("/api/v1/dict/**").permitAll()
                        .requestMatchers("/api/v1/hanja/characters/**").permitAll()
                        .requestMatchers("/api/v1/hanja/stats").permitAll()
                        .requestMatchers("/api/v1/hanja/pack-skus").permitAll()
                        .requestMatchers("/api/v1/products/skus").permitAll()
                        .requestMatchers("/api/v1/admin/**").permitAll()
                        .requestMatchers("/api/v1/premium-features/**").hasRole("PREMIUM")
                        .anyRequest().authenticated()
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType("application/json;charset=UTF-8");
                            response.getWriter().write("{\"message\":\"Yêu cầu đăng nhập\"}");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType("application/json;charset=UTF-8");
                            response.getWriter().write("{\"message\":\"Không có quyền truy cập\"}");
                        })
                )
                .addFilterBefore(securityHeadersFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(adminApiKeyFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(resolveAllowedOriginPatterns());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Admin-Key"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private List<String> resolveAllowedOriginPatterns() {
        if (corsAllowedOriginPatterns != null && !corsAllowedOriginPatterns.isBlank()) {
            return Arrays.stream(corsAllowedOriginPatterns.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        }

        List<String> patterns = new ArrayList<>();
        patterns.add("https://topik-frontend-red.vercel.app");

        boolean isDev = Arrays.stream(environment.getActiveProfiles())
                .noneMatch(profile -> profile.equalsIgnoreCase("prod"));
        if (isDev) {
            patterns.add("http://localhost:*");
            patterns.add("http://127.0.0.1:*");
            patterns.add("http://192.168.*:*");
            patterns.add("http://10.*:*");
        }
        return patterns;
    }
}
