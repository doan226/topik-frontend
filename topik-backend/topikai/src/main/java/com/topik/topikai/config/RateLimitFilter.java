package com.topik.topikai.config;

import com.topik.topikai.security.SecurityUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Map<String, Deque<Instant>> BUCKETS = new ConcurrentHashMap<>();

    private record Rule(String method, String path, int maxRequests, int windowMinutes, boolean byUser) {}

    private static final List<Rule> RULES = List.of(
            new Rule("POST", "/api/v1/auth/login", 10, 15, false),
            new Rule("POST", "/api/v1/auth/register", 5, 60, false),
            new Rule("POST", "/api/v1/auth/verify", 10, 15, false),
            new Rule("POST", "/api/v1/topik/submit", 30, 60, true),
            new Rule("POST", "/api/v1/exams/interactive/ai-explain", 20, 60, true),
            new Rule("POST", "/api/v1/dashboard/generate-test", 5, 60, true)
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String method = request.getMethod();
        String path = request.getRequestURI();

        Rule matched = RULES.stream()
                .filter(rule -> rule.method().equalsIgnoreCase(method) && path.equals(rule.path()))
                .findFirst()
                .orElse(null);

        if (matched != null && isRateLimited(request, matched)) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"message\":\"Quá nhiều yêu cầu. Vui lòng thử lại sau.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isRateLimited(HttpServletRequest request, Rule rule) {
        String key = buildKey(request, rule);
        Deque<Instant> timestamps = BUCKETS.computeIfAbsent(key, ignored -> new ConcurrentLinkedDeque<>());
        Instant windowStart = Instant.now().minusSeconds(rule.windowMinutes() * 60L);

        synchronized (timestamps) {
            while (!timestamps.isEmpty() && timestamps.peekFirst().isBefore(windowStart)) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= rule.maxRequests()) {
                return true;
            }
            timestamps.addLast(Instant.now());
        }
        return false;
    }

    private String buildKey(HttpServletRequest request, Rule rule) {
        if (rule.byUser()) {
            Long userId = SecurityUtils.getCurrentUserId();
            if (userId != null) {
                return rule.path() + ":user:" + userId;
            }
        }
        return rule.path() + ":ip:" + clientIp(request);
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
