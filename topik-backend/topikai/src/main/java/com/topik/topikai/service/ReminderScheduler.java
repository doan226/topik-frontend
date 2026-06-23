package com.topik.topikai.service; // Chỉnh lại theo đúng thư mục bạn lưu

import com.topik.topikai.entity.User;
import com.topik.topikai.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ReminderScheduler {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    /**
     * Cấu hình Cron: Giây Phút Giờ Ngày Tháng Thứ
     * "0 0 20 * * ?" có nghĩa là: 0 giây, 0 phút, 20 giờ (8h tối), mỗi ngày.
     * zone = "Asia/Seoul": Ép Render chạy theo đúng múi giờ Hàn Quốc (Tránh bị gửi nhầm giờ do server quốc tế).
     */
    @Scheduled(cron = "0 0 20 * * ?", zone = "Asia/Seoul")
    public void sendDailyReminders() {
        System.out.println("⏳ Đang bắt đầu tiến trình gửi mail nhắc nhở tự động...");

        // 1. Lấy danh sách tất cả người dùng trong Database
        List<User> users = userRepository.findAll();

        // 2. Vòng lặp gửi mail cho từng người
        for (User user : users) {
            if (user.getEmail() != null && !user.getEmail().isEmpty() && user.isReminderEnabled()) {

                // Gọi hàm gửi mail vừa tạo ở Bước 2
                emailService.sendReminderEmail(user.getEmail(), user.getUsername());

                // Nghỉ 1 giây giữa các lần gửi để Brevo API không đánh dấu là Spam
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        }
        System.out.println("🎉 Đã hoàn thành gửi mail nhắc nhở cho tất cả học sinh!");
    }
}