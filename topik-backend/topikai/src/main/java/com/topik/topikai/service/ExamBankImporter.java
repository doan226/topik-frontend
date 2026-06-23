package com.topik.topikai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.topik.topikai.entity.ExamQuestion;
import com.topik.topikai.repository.ExamQuestionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.stream.Stream;

/**
 * Importer tổng quát: quét mọi file data/topik2-*-bank.json và nạp vào DB.
 * Có thể giới hạn 1 kỳ qua tham số (vd "topik2-60") để seed thử nghiệm.
 */
@Service
public class ExamBankImporter {

    private static final Logger log = LoggerFactory.getLogger(ExamBankImporter.class);

    @Autowired
    private ExamQuestionRepository repository;

    @Value("${exam.bank.dir:../../topik-frontend/data}")
    private String bankDir;

    private final ObjectMapper mapper = new ObjectMapper();

    /** Nạp toàn bộ kỳ (only = null) hoặc một kỳ cụ thể (only = "topik2-60"). */
    @Transactional
    public int importAll(String only) throws Exception {
        Path dir = Path.of(bankDir).toAbsolutePath().normalize();
        if (!Files.isDirectory(dir)) {
            throw new IllegalStateException("Không tìm thấy thư mục bank: " + dir);
        }

        List<Path> files = new ArrayList<>();
        try (Stream<Path> s = Files.list(dir)) {
            s.filter(p -> {
                String n = p.getFileName().toString();
                return n.startsWith("topik2-") && n.endsWith("-bank.json")
                        && (only == null || n.equals(only + "-bank.json"));
            }).sorted().forEach(files::add);
        }
        if (files.isEmpty()) {
            throw new IllegalStateException("Không có file bank phù hợp trong " + dir
                    + (only == null ? "" : " cho " + only));
        }

        int total = 0;
        for (Path file : files) {
            total += importFile(file);
        }
        return total;
    }

    @Transactional
    public int importFile(Path file) throws Exception {
        List<Map<String, Object>> rows = mapper.readValue(
                Files.readString(file),
                new TypeReference<List<Map<String, Object>>>() {}
        );
        if (rows.isEmpty()) {
            log.warn("Bỏ qua file rỗng: {}", file);
            return 0;
        }

        Set<String> examIds = new LinkedHashSet<>();
        for (Map<String, Object> row : rows) {
            examIds.add(str(row.get("examId"), "topik2-unknown"));
        }
        for (String examId : examIds) {
            long removed = repository.deleteByExamId(examId);
            log.info("Đã xóa {} câu cũ của {}", removed, examId);
        }

        int inserted = 0;
        for (Map<String, Object> row : rows) {
            ExamQuestion q = new ExamQuestion();
            q.setExamId(str(row.get("examId"), "topik2-unknown"));
            q.setSection(str(row.get("section"), "listening"));
            q.setQuestionNo(str(row.get("questionNo"), String.valueOf(inserted + 1)));
            q.setSortOrder(inserted + 1);
            q.setTier(str(row.get("tier"), "free"));
            q.setCorrectAns(str(row.get("correct_ans"), ""));

            Object content = row.get("content_json");
            if (content == null) {
                throw new IllegalStateException("Thiếu content_json tại câu " + q.getQuestionNo() + " (" + file + ")");
            }
            q.setContentJson(mapper.writeValueAsString(content));
            repository.save(q);
            inserted++;
        }

        log.info("Import {} câu từ {}", inserted, file.getFileName());
        return inserted;
    }

    private static String str(Object value, String fallback) {
        if (value == null) return fallback;
        String s = String.valueOf(value).trim();
        return s.isEmpty() ? fallback : s;
    }
}
