package com.topik.topikai.config;

import com.topik.topikai.service.ExamBankImporter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Seed đề tương tác từ bank JSON.
 *   -Dseed.exams=true                  -> nạp toàn bộ kỳ
 *   -Dseed.exams=true -Dseed.only=topik2-60 -> chỉ nạp 1 kỳ (thử nghiệm)
 */
@Component
@ConditionalOnProperty(name = "seed.exams", havingValue = "true")
public class SeedExamsRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedExamsRunner.class);

    @Autowired
    private ExamBankImporter importer;

    @org.springframework.beans.factory.annotation.Value("${seed.only:}")
    private String only;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        String target = (only == null || only.isBlank()) ? null : only.trim();
        int count = importer.importAll(target);
        log.info("Seed hoàn tất: {} câu hỏi ({})", count, target == null ? "tất cả kỳ" : target);
        System.exit(0);
    }
}
