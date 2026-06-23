package com.topik.topikai.repository;

import com.topik.topikai.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // Hàm tự động tìm tài khoản theo tên đăng nhập
    Optional<User> findByUsername(String username);

    // Hàm kiểm tra xem tên đăng nhập đã bị người khác đăng ký chưa
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}