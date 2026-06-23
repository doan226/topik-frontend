package com.topik.topikai.config;

import com.topik.topikai.service.Topik91BankImporter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "seed.topik91", havingValue = "true")
public class Topik91SeedRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(Topik91SeedRunner.class);

    @Autowired
    private Topik91BankImporter importer;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        int count = importer.importBank();
        log.info("Seed topik2-91 hoàn tất: {} câu hỏi", count);
        System.exit(0);
    }
}
