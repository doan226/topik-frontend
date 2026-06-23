package com.topik.topikai.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.topik.topikai.entity.ExamQuestion;
import com.topik.topikai.repository.ExamQuestionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class ExamQuestionSeeder implements ApplicationRunner {

    @Autowired
    private ExamQuestionRepository repository;

    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (repository.count() > 0) return;

        ExamQuestion listening = new ExamQuestion();
        listening.setExamId("topik2-35");
        listening.setSection("listening");
        listening.setQuestionNo("1");
        listening.setSortOrder(1);
        listening.setCorrectAns("1");
        listening.setTier("free");
        listening.setContentJson(mapper.writeValueAsString(Map.of(
                "passage", "Luyện nghe phát âm phụ âm tiếng Hàn.",
                "audio_url", "/audio/korean_sample.mp3",
                "options", List.of(
                        "Đoạn băng đang phát âm các phụ âm cơ bản.",
                        "Đoạn băng đang phát âm bảng chữ cái tiếng Anh.",
                        "Đoạn băng đang phát âm các nguyên âm tiếng Hàn.",
                        "Đoạn băng đang đọc chính tả câu 51."
                )
        )));
        repository.save(listening);

        ExamQuestion reading = new ExamQuestion();
        reading.setExamId("topik2-35");
        reading.setSection("reading");
        reading.setQuestionNo("1");
        reading.setSortOrder(1);
        reading.setCorrectAns("2");
        reading.setTier("pro");
        reading.setContentJson(mapper.writeValueAsString(Map.of(
                "passage", "한옥은 한국의 전통적인 주택이다. 최근에는 관광객들이 한옥에서 하룻밤을 보내는 체험을 즐긴다.",
                "options", List.of(
                        "한옥은 현대 아파트와 같다.",
                        "관광객들이 한옥 체험을 한다.",
                        "한옥은 더 이상 존재하지 않는다.",
                        "한옥은 서양식 건축이다."
                )
        )));
        repository.save(reading);
    }
}
