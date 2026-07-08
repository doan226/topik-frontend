package com.topik.topikai.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.util.concurrent.Semaphore;

@Configuration
public class AiClientConfig {

    /** RestTemplate dùng chung cho mọi lời gọi Gemini, có timeout để tránh treo thread vô hạn. */
    @Bean
    public RestTemplate geminiRestTemplate(GeminiProperties props) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(props.getConnectTimeoutMs());
        factory.setReadTimeout(props.getReadTimeoutMs());
        return new RestTemplate(factory);
    }

    /** Giới hạn số lời gọi Gemini song song. Số "vé" = gemini.max-concurrent (TRẦN có thể nâng bằng env var). */
    @Bean
    public Semaphore geminiSemaphore(GeminiProperties props) {
        return new Semaphore(props.getMaxConcurrent(), true);
    }
}
