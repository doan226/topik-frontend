package com.topik.topikai.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.topik.topikai.dto.WritingQuestionDto;
import com.topik.topikai.repository.WritingQuestionRepository;
import com.topik.topikai.service.WritingQuestionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.List;

@Component
public class QuestionDataInitializer implements ApplicationRunner {

    @Autowired
    private WritingQuestionRepository repository;

    @Autowired
    private WritingQuestionService writingQuestionService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (repository.count() > 0) return;

        ClassPathResource resource = new ClassPathResource("question-bank.json");
        if (!resource.exists()) {
            seedLegacyFallback();
            return;
        }

        try (InputStream in = resource.getInputStream()) {
            List<WritingQuestionDto> dtos = objectMapper.readValue(in, new TypeReference<>() {});
            writingQuestionService.upsertAll(dtos);
        }
    }

    /** Minimal fallback if JSON resource is missing */
    private void seedLegacyFallback() {
        writingQuestionService.upsertAll(List.of(
                dto(3551, 35, 51, 150, 10,
                        "무료로 드립니다.\n유학생인데 공부를 마치고 다음 주에 고향으로 돌아갑니다.",
                        "㉠ 제가 쓰던 물건들을 정리하고 있습니다.\n㉡ 방을 비워 줘야 하기 때문입니다.", null),
                dto(3651, 36, 51, 150, 10,
                        "도서관 이용 안내\n우리 도서관을 이용해 주셔서 감사합니다.",
                        "㉠ 할 예정입니다\n㉡ 이용하실 수 없습니다", null)
        ));
    }

    private WritingQuestionDto dto(int externalId, int topik, int type, int timeLimit, int maxScore,
                                   String prompt, String answer, String imageUrl) {
        WritingQuestionDto d = new WritingQuestionDto();
        d.setExternalId(externalId);
        d.setTopik(topik);
        d.setType(type);
        d.setTimeLimit(timeLimit);
        d.setMaxScore(maxScore);
        d.setPrompt(prompt);
        d.setAnswer(answer);
        d.setImageUrl(imageUrl);
        return d;
    }
}
