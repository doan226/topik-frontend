package com.topik.topikai.security;

import com.topik.topikai.entity.Role;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

public final class RoleAuthorityMapper {

    private RoleAuthorityMapper() {
    }

    public static Collection<? extends GrantedAuthority> toAuthorities(Role role) {
        List<GrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
        if (role == Role.PREMIUM_USER || role == Role.ADMIN) {
            authorities.add(new SimpleGrantedAuthority("ROLE_PREMIUM"));
        }
        if (role == Role.ADMIN) {
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        }
        return authorities;
    }
}
