package com.topik.topikai.controller;

import com.topik.topikai.config.VnPayConfig;
import com.topik.topikai.repository.UserRepository;
import com.topik.topikai.security.SecurityUtils;
import com.topik.topikai.service.EntitlementService;
import com.topik.topikai.service.SkuPaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;

@RestController
@RequestMapping("/api/v1/payment")
public class PaymentController {

    @Value("${vnpay.tmncode}")
    private String vnp_TmnCode;

    @Value("${vnpay.hashsecret}")
    private String vnp_HashSecret;

    @Value("${vnpay.url}")
    private String vnp_PayUrl;

    @Value("${vnpay.returnurl}")
    private String vnp_ReturnUrl;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntitlementService entitlementService;

    @Autowired
    private SkuPaymentService skuPaymentService;

    private static int resolvePrice(String skuCode) {
        if (skuCode == null) return EntitlementService.PRICE_WRITING_LIFE;
        return switch (skuCode.toUpperCase()) {
            case "TOPIKVIET" -> EntitlementService.PRICE_WRITING_90D;
            case "TOPIKI" -> EntitlementService.PRICE_TOPIK1;
            case "TOPIKHANJA" -> EntitlementService.PRICE_HANJA;
            case "TOPIKALL" -> EntitlementService.PRICE_ALLIN;
            default -> EntitlementService.PRICE_WRITING_LIFE;
        };
    }

    // 1. TẠO URL THANH TOÁN GỬI VỀ REACT
    @PostMapping("/create-url")
    public Map<String, String> createPaymentUrl(@RequestBody(required = false) Map<String, Object> payload) {
        Long userId = SecurityUtils.requireCurrentUserId();
        String skuCode = payload != null && payload.get("sku") != null
                ? String.valueOf(payload.get("sku")).toUpperCase()
                : "TOPIKVIP";
        long amountVnd = resolvePrice(skuCode);
        String vnp_TxnRef = userId + "_" + System.currentTimeMillis();
        long amount = amountVnd * 100L;

        String vnp_Version = "2.1.0";
        String vnp_Command = "pay";
        String orderType = "other";

        Map<String, String> vnp_Params = new HashMap<>();
        vnp_Params.put("vnp_Version", vnp_Version);
        vnp_Params.put("vnp_Command", vnp_Command);
        vnp_Params.put("vnp_TmnCode", vnp_TmnCode);
        vnp_Params.put("vnp_Amount", String.valueOf(amount));
        vnp_Params.put("vnp_CurrCode", "VND");
        vnp_Params.put("vnp_TxnRef", vnp_TxnRef);
        vnp_Params.put("vnp_OrderInfo", skuCode + " " + userId);
        vnp_Params.put("vnp_OrderType", orderType);
        vnp_Params.put("vnp_Locale", "vn");
        vnp_Params.put("vnp_ReturnUrl", vnp_ReturnUrl);
        vnp_Params.put("vnp_IpAddr", "127.0.0.1");

        Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Etc/GMT+7"));
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
        vnp_Params.put("vnp_CreateDate", formatter.format(cld.getTime()));

        cld.add(Calendar.MINUTE, 15);
        vnp_Params.put("vnp_ExpireDate", formatter.format(cld.getTime()));

        List<String> fieldNames = new ArrayList<>(vnp_Params.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();

        try {
            Iterator<String> itr = fieldNames.iterator();
            while (itr.hasNext()) {
                String fieldName = itr.next();
                String fieldValue = vnp_Params.get(fieldName);
                if ((fieldValue != null) && (fieldValue.length() > 0)) {
                    hashData.append(fieldName);
                    hashData.append('=');
                    hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));

                    query.append(URLEncoder.encode(fieldName, StandardCharsets.US_ASCII.toString()));
                    query.append('=');
                    query.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));
                    if (itr.hasNext()) {
                        query.append('&');
                        hashData.append('&');
                    }
                }
            }

            String queryUrl = query.toString();
            String vnp_SecureHash = VnPayConfig.hmacSHA512(vnp_HashSecret, hashData.toString());
            queryUrl += "&vnp_SecureHash=" + vnp_SecureHash;
            String paymentUrl = vnp_PayUrl + "?" + queryUrl;

            Map<String, String> response = new HashMap<>();
            response.put("paymentUrl", paymentUrl);
            return response;
        } catch (Exception e) {
            throw new RuntimeException("Lỗi tạo URL thanh toán");
        }
    }

    // 2. NHẬN KẾT QUẢ TỪ VNPAY TRẢ VỀ (WEBHOOK) ĐỂ NÂNG CẤP TÀI KHOẢN
    @GetMapping("/vnpay-return")
    public Map<String, Object> paymentReturn(@RequestParam Map<String, String> queryParams) {
        Map<String, Object> response = new HashMap<>();
        String vnp_SecureHash = queryParams.get("vnp_SecureHash");
        queryParams.remove("vnp_SecureHash");
        queryParams.remove("vnp_SecureHashType");

        // Xác thực lại chữ ký số để đảm bảo hacker không fake request
        List<String> fieldNames = new ArrayList<>(queryParams.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        try {
            for (String fieldName : fieldNames) {
                String fieldValue = queryParams.get(fieldName);
                if ((fieldValue != null) && (fieldValue.length() > 0)) {
                    hashData.append(fieldName).append('=').append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString())).append('&');
                }
            }
            if (hashData.length() > 0) {
                hashData.setLength(hashData.length() - 1);
            }

            String signValue = VnPayConfig.hmacSHA512(vnp_HashSecret, hashData.toString());

            if (signValue.equals(vnp_SecureHash)) {
                if ("00".equals(queryParams.get("vnp_ResponseCode"))) {
                    String txnRef = queryParams.get("vnp_TxnRef");
                    Long userId = Long.parseLong(txnRef.split("_")[0]);
                    String orderInfo = queryParams.getOrDefault("vnp_OrderInfo", "TOPIKVIP " + userId);
                    int amountVnd = 0;
                    try {
                        amountVnd = Integer.parseInt(queryParams.getOrDefault("vnp_Amount", "0")) / 100;
                    } catch (NumberFormatException ignored) {
                    }

                    if (userRepository.findById(userId).isPresent()
                            && skuPaymentService.processPayment(orderInfo, amountVnd).isPresent()) {
                        response.put("success", true);
                        response.put("message", "Thanh toán thành công. Gói đã được kích hoạt!");
                        return response;
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        response.put("success", false);
        response.put("message", "Giao dịch thất bại hoặc bị từ chối.");
        return response;
    }
}