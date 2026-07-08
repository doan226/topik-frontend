package com.topik.topikai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "gemini")
public class GeminiProperties {

    /** TRẦN: số lời gọi Gemini song song tối đa. Nâng giá trị này (env GEMINI_MAX_CONCURRENT) khi nâng gói Gemini. */
    private int maxConcurrent = 5;

    /** Thời gian tối đa chờ lấy "vé" gọi Gemini trước khi báo bận (ms). */
    private long acquireTimeoutMs = 8000;

    /** Timeout thiết lập kết nối tới Gemini (ms). */
    private int connectTimeoutMs = 5000;

    /** Timeout chờ phản hồi từ Gemini (ms). */
    private int readTimeoutMs = 30000;

    /** Số lần thử lại tối đa cho mỗi model khi gặp lỗi tạm thời. */
    private int maxRetries = 3;

    /** Backoff ban đầu giữa các lần thử lại (ms). */
    private long retryInitialMs = 2000;

    /** Backoff tối đa giữa các lần thử lại (ms). */
    private long retryMaxMs = 8000;

    public int getMaxConcurrent() {
        return maxConcurrent;
    }

    public void setMaxConcurrent(int maxConcurrent) {
        this.maxConcurrent = maxConcurrent;
    }

    public long getAcquireTimeoutMs() {
        return acquireTimeoutMs;
    }

    public void setAcquireTimeoutMs(long acquireTimeoutMs) {
        this.acquireTimeoutMs = acquireTimeoutMs;
    }

    public int getConnectTimeoutMs() {
        return connectTimeoutMs;
    }

    public void setConnectTimeoutMs(int connectTimeoutMs) {
        this.connectTimeoutMs = connectTimeoutMs;
    }

    public int getReadTimeoutMs() {
        return readTimeoutMs;
    }

    public void setReadTimeoutMs(int readTimeoutMs) {
        this.readTimeoutMs = readTimeoutMs;
    }

    public int getMaxRetries() {
        return maxRetries;
    }

    public void setMaxRetries(int maxRetries) {
        this.maxRetries = maxRetries;
    }

    public long getRetryInitialMs() {
        return retryInitialMs;
    }

    public void setRetryInitialMs(long retryInitialMs) {
        this.retryInitialMs = retryInitialMs;
    }

    public long getRetryMaxMs() {
        return retryMaxMs;
    }

    public void setRetryMaxMs(long retryMaxMs) {
        this.retryMaxMs = retryMaxMs;
    }
}
