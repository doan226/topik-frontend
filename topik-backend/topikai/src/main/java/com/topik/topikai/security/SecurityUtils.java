package com.topik.topikai.security;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static TopikUserPrincipal getCurrentPrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof TopikUserPrincipal principal)) {
            return null;
        }
        return principal;
    }

    public static Long getCurrentUserId() {
        TopikUserPrincipal principal = getCurrentPrincipal();
        return principal != null ? principal.getId() : null;
    }

    public static Long requireCurrentUserId() {
        Long userId = getCurrentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Yêu cầu đăng nhập");
        }
        return userId;
    }

    public static void assertUserAccess(Long requestedUserId) {
        Long currentUserId = requireCurrentUserId();
        if (requestedUserId == null || !currentUserId.equals(requestedUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền truy cập dữ liệu người dùng này");
        }
    }
}
