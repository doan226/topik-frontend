package com.topik.topikai.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class AdminApiKeyFilter extends OncePerRequestFilter {

    @Value("${admin.api.key:}")
    private String adminApiKey;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path == null
                || (!path.startsWith("/api/v1/admin/") && !path.startsWith("/api/v1/project/"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String configured = adminApiKey != null ? adminApiKey.trim() : "";
        if (configured.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"error\":\"Admin API chưa được cấu hình (admin.api.key).\"}");
            return;
        }

        String provided = request.getHeader("X-Admin-Key");
        if (provided == null || !configured.equals(provided.trim())) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"error\":\"Thiếu hoặc sai X-Admin-Key.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
