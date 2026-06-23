package com.topik.topikai.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.*;

@Service
public class DictionaryService {

    private static final Logger log = LoggerFactory.getLogger(DictionaryService.class);

    @Value("${dictionary.sqlite.path:data/dictionary.db}")
    private String dictionaryPath;

    private final Map<String, Map<String, Object>> memoryFallback = new LinkedHashMap<>();
    private String resolvedDbPath;

    @PostConstruct
    public void init() {
        seedMemoryFallback();
        resolvedDbPath = resolveDbPath();
        ensureSqliteSeeded();
    }

    public Map<String, Object> lookup(String word) {
        String clean = word == null ? "" : word.trim();
        if (clean.isEmpty()) {
            return Map.of("success", false, "message", "Empty word");
        }

        if (resolvedDbPath != null) {
            try (Connection conn = DriverManager.getConnection("jdbc:sqlite:" + resolvedDbPath)) {
                try (PreparedStatement ps = conn.prepareStatement(
                        "SELECT word, meaning, pos, synonyms, antonyms FROM dictionary WHERE word = ?")) {
                    ps.setString(1, clean);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            return Map.of(
                                    "success", true,
                                    "word", rs.getString("word"),
                                    "meaning", rs.getString("meaning"),
                                    "pos", rs.getString("pos"),
                                    "synonyms", parseJsonArray(rs.getString("synonyms")),
                                    "antonyms", parseJsonArray(rs.getString("antonyms"))
                            );
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("SQLite lookup failed, using memory fallback: {}", e.getMessage());
            }
        }

        Map<String, Object> hit = memoryFallback.get(clean);
        if (hit != null) {
            Map<String, Object> out = new LinkedHashMap<>(hit);
            out.put("success", true);
            out.put("word", clean);
            return out;
        }

        for (Map.Entry<String, Map<String, Object>> e : memoryFallback.entrySet()) {
            if (clean.contains(e.getKey()) || e.getKey().contains(clean)) {
                Map<String, Object> out = new LinkedHashMap<>(e.getValue());
                out.put("success", true);
                out.put("word", e.getKey());
                return out;
            }
        }

        return Map.of("success", false, "message", "Không tìm thấy trong từ điển.");
    }

    private void ensureSqliteSeeded() {
        if (resolvedDbPath == null) return;
        try (Connection conn = DriverManager.getConnection("jdbc:sqlite:" + resolvedDbPath)) {
            conn.createStatement().execute("""
                CREATE TABLE IF NOT EXISTS dictionary (
                  word TEXT PRIMARY KEY,
                  meaning TEXT NOT NULL,
                  pos TEXT NOT NULL,
                  synonyms TEXT,
                  antonyms TEXT
                )
                """);
            try (ResultSet rs = conn.createStatement().executeQuery("SELECT COUNT(*) AS c FROM dictionary")) {
                if (rs.next() && rs.getInt("c") > 0) return;
            }
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT OR REPLACE INTO dictionary (word, meaning, pos, synonyms, antonyms) VALUES (?,?,?,?,?)")) {
                for (Map.Entry<String, Map<String, Object>> e : memoryFallback.entrySet()) {
                    ps.setString(1, e.getKey());
                    ps.setString(2, String.valueOf(e.getValue().get("meaning")));
                    ps.setString(3, String.valueOf(e.getValue().get("pos")));
                    ps.setString(4, "[]");
                    ps.setString(5, "[]");
                    ps.addBatch();
                }
                ps.executeBatch();
            }
            log.info("Seeded SQLite dictionary at {}", resolvedDbPath);
        } catch (Exception e) {
            log.warn("Could not seed SQLite dictionary: {}", e.getMessage());
        }
    }

    private String resolveDbPath() {
        try {
            if (dictionaryPath.startsWith("classpath:")) {
                var resource = getClass().getClassLoader().getResource(dictionaryPath.substring("classpath:".length()));
                if (resource != null) {
                    Path tmp = Files.createTempFile("topik-dict-", ".db");
                    tmp.toFile().deleteOnExit();
                    Files.copy(resource.openStream(), tmp, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                    return tmp.toAbsolutePath().toString();
                }
            }
            Path p = Path.of(dictionaryPath);
            if (Files.exists(p)) return p.toAbsolutePath().toString();
        } catch (Exception e) {
            log.warn("Dictionary path resolve failed: {}", e.getMessage());
        }
        try {
            Path dataDir = Path.of("data");
            Files.createDirectories(dataDir);
            return dataDir.resolve("dictionary.db").toAbsolutePath().toString();
        } catch (Exception e) {
            return null;
        }
    }

    private void seedMemoryFallback() {
        put("학생", "Học sinh, người đang theo học tại các trường lớp", "Danh từ");
        put("생활", "Sinh hoạt, cuộc sống thường nhật", "Danh từ");
        put("생일", "Ngày sinh nhật", "Danh từ");
        put("생각", "Ý nghĩ, suy nghĩ", "Danh từ");
        put("학교", "Trường học", "Danh từ");
        put("공부", "Sự học hành", "Danh từ");
        put("선생", "Thầy giáo", "Danh từ");
        put("컴퓨터", "Máy vi tính", "Danh từ");
        put("독서", "Sự đọc sách", "Danh từ");
        put("의사", "Bác sĩ", "Danh từ");
        put("병원", "Bệnh viện", "Danh từ");
        put("자동차", "Xe ô tô", "Danh từ");
        put("요리", "Sự nấu ăn", "Danh từ");
        put("미용", "Thẩm mỹ, làm đẹp", "Danh từ");
        put("데이터베이스", "Cơ sở dữ liệu", "Danh từ");
        put("알고리즘", "Thuật toán", "Danh từ");
        put("마케팅", "Tiếp thị", "Danh từ");
    }

    private void put(String word, String meaning, String pos) {
        memoryFallback.put(word, Map.of("meaning", meaning, "pos", pos, "synonyms", List.of(), "antonyms", List.of()));
    }

    private static List<String> parseJsonArray(String json) {
        if (json == null || json.isBlank()) return List.of();
        json = json.trim();
        if (json.startsWith("[") && json.endsWith("]")) {
            json = json.substring(1, json.length() - 1).trim();
            if (json.isEmpty()) return List.of();
            return Arrays.stream(json.split(",")).map(s -> s.replace("\"", "").trim()).filter(s -> !s.isEmpty()).toList();
        }
        return List.of();
    }
}
