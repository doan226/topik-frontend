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
import java.util.List;
import java.util.Map;

@Service
public class Topik91BankImporter {

    private static final Logger log = LoggerFactory.getLogger(Topik91BankImporter.class);
    private static final String EXAM_ID = "topik2-91";

    @Autowired
    private ExamQuestionRepository repository;

    @Value("${topik91.bank.path:../../topik-frontend/data/topik2-91-bank.json}")
    private String bankPath;

    private final ObjectMapper mapper = new ObjectMapper();

    @Transactional
    public int importBank() throws Exception {
        Path path = Path.of(bankPath).toAbsolutePath().normalize();
        if (!Files.isRegularFile(path)) {
            throw new IllegalStateException("Không tìm thấy file ngân hàng đề: " + path);
        }

        List<Map<String, Object>> rows = mapper.readValue(
                Files.readString(path),
                new TypeReference<List<Map<String, Object>>>() {}
        );
        if (rows.isEmpty()) {
            throw new IllegalStateException("File ngân hàng đề trống: " + path);
        }

        long removed = repository.deleteByExamId(EXAM_ID);
        log.info("Đã xóa {} câu hỏi cũ của {}", removed, EXAM_ID);

        int inserted = 0;
        for (Map<String, Object> row : rows) {
            ExamQuestion q = new ExamQuestion();
            q.setExamId(str(row.get("examId"), EXAM_ID));
            q.setSection(str(row.get("section"), "listening"));
            q.setQuestionNo(str(row.get("questionNo"), String.valueOf(inserted + 1)));
            q.setSortOrder(inserted + 1);
            q.setTier(str(row.get("tier"), "free"));
            q.setCorrectAns(str(row.get("correct_ans"), ""));

            Object content = row.get("content_json");
            if (content == null) {
                throw new IllegalStateException("Thiếu content_json tại câu " + q.getQuestionNo());
            }
            q.setContentJson(mapper.writeValueAsString(content));
            repository.save(q);
            inserted++;
        }

        log.info("Import {} câu hỏi {} từ {}", inserted, EXAM_ID, path);
        return inserted;
    }

    private static String str(Object value, String fallback) {
        if (value == null) return fallback;
        String s = String.valueOf(value).trim();
        return s.isEmpty() ? fallback : s;
    }
}
