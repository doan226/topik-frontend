package com.topik.topikai.service;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class EmailService {

    // Lấy Key và Email người gửi từ application.properties (và từ Render)
    @Value("${brevo.api.key}")
    private String brevoApiKey;

    @Value("${brevo.sender.email}")
    private String senderEmail;

    // URL chuẩn của Brevo API để gửi mail (Cổng HTTPS 443 xuyên mọi tường lửa)
    private final String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    // ==========================================
    // 1. HÀM GỬI MAIL XÁC THỰC OTP (KHI ĐĂNG KÝ)
    // ==========================================
    public void sendVerificationEmail(String toEmail, String otpCode) {
        try {
            RestTemplate restTemplate = new RestTemplate();

            // 1. Cấu hình Headers (Chứa API Key để Brevo cho phép đi qua)
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("accept", "application/json");
            headers.set("api-key", brevoApiKey);

            // 2. Xây dựng cấu trúc dữ liệu JSON gửi đi
            JSONObject jsonBody = new JSONObject();

            // Người gửi
            JSONObject sender = new JSONObject();
            sender.put("name", "TOPIK AI Master");
            sender.put("email", senderEmail);
            jsonBody.put("sender", sender);

            // Người nhận
            JSONArray toArray = new JSONArray();
            JSONObject receiver = new JSONObject();
            receiver.put("email", toEmail);
            toArray.put(receiver);
            jsonBody.put("to", toArray);

            // Tiêu đề và Nội dung
            jsonBody.put("subject", "Mã xác thực đăng ký tài khoản TOPIK AI Master");

            // Thiết kế giao diện HTML cho email đẹp mắt
            String htmlContent = "<div style='font-family: Arial, sans-serif; padding: 20px; text-align: center;'>"
                    + "<h2 style='color: #2b6cb0;'>Xác thực tài khoản TOPIK AI</h2>"
                    + "<p>Chào bạn, đây là mã OTP để kích hoạt tài khoản của bạn:</p>"
                    + "<h1 style='color: #e53e3e; letter-spacing: 5px;'>" + otpCode + "</h1>"
                    + "<p>Mã này có hiệu lực trong 5 phút. Tuyệt đối không chia sẻ cho người khác.</p>"
                    + "</div>";

            jsonBody.put("htmlContent", htmlContent);

            // 3. Đóng gói và Gắn tên lửa phóng đi
            HttpEntity<String> request = new HttpEntity<>(jsonBody.toString(), headers);
            ResponseEntity<String> response = restTemplate.postForEntity(BREVO_API_URL, request, String.class);

            System.out.println("✅ Gửi mail OTP thành công qua Brevo API! Trạng thái: " + response.getStatusCode());

        } catch (Exception e) {
            System.err.println("🔴 LỖI GỬI MAIL OTP BREVO API: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // ==========================================
    // 2. HÀM GỬI MAIL NHẮC NHỞ HỌC TẬP (MỚI THÊM)
    // ==========================================
    public void sendReminderEmail(String toEmail, String username) {
        try {
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("accept", "application/json");
            headers.set("api-key", brevoApiKey);

            JSONObject jsonBody = new JSONObject();

            JSONObject sender = new JSONObject();
            sender.put("name", "TOPIK AI Master");
            sender.put("email", senderEmail);
            jsonBody.put("sender", sender);

            JSONArray toArray = new JSONArray();
            JSONObject receiver = new JSONObject();
            receiver.put("email", toEmail);
            toArray.put(receiver);
            jsonBody.put("to", toArray);

            jsonBody.put("subject", "Đến giờ ôn thi TOPIK rồi bạn ơi! 📚");

            // Thiết kế giao diện HTML truyền cảm hứng cho việc học
            String htmlContent = "<div style='font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; max-width: 600px; margin: auto;'>"
                    + "<h2 style='color: #3182ce; text-align: center;'>Chào " + username + ",</h2>"
                    + "<p style='font-size: 16px; color: #4a5568;'>Kỳ thi TOPIK đang đến gần. Đừng quên dành ít nhất 30 phút hôm nay để luyện đề trên hệ thống TOPIK AI Master nhé!</p>"
                    + "<div style='text-align: center; margin: 30px 0;'>"
                    + "<a href='https://topik-frontend-red.vercel.app' style='background-color: #3182ce; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;'>Vào Học Ngay</a>"
                    + "</div>"
                    + "<p style='font-size: 14px; color: #718096; text-align: center;'>Chúc bạn học tập hiệu quả! 화이팅! 🚀</p>"
                    + "</div>";

            jsonBody.put("htmlContent", htmlContent);

            HttpEntity<String> request = new HttpEntity<>(jsonBody.toString(), headers);
            ResponseEntity<String> response = restTemplate.postForEntity(BREVO_API_URL, request, String.class);

            System.out.println("✅ Đã gửi mail nhắc nhở thành công tới: " + toEmail);

        } catch (Exception e) {
            System.err.println("🔴 LỖI GỬI MAIL NHẮC NHỞ: " + e.getMessage());
            e.printStackTrace();
        }
    }
}