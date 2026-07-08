package com.topik.topikai;

import com.topik.topikai.entity.UserAnswer;
import com.topik.topikai.repository.FsrsCardRepository;
import com.topik.topikai.repository.LearnerGoalsRepository;
import com.topik.topikai.repository.UserAnswerRepository;
import com.topik.topikai.repository.UserMilestoneRepository;
import com.topik.topikai.repository.UserRepository;
import com.topik.topikai.service.LearnerProfileService;
import com.topik.topikai.service.MistakeSrsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class LearnerProfileServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserAnswerRepository userAnswerRepository;

    @Mock
    private LearnerGoalsRepository learnerGoalsRepository;

    @Mock
    private UserMilestoneRepository userMilestoneRepository;

    @Mock
    private MistakeSrsService mistakeSrsService;

    @InjectMocks
    private LearnerProfileService learnerProfileService;

    @BeforeEach
    void setup() {
        when(mistakeSrsService.countDueMistakes(1L)).thenReturn(2L);
        when(userMilestoneRepository.findByUserIdOrderByAchievedAtDesc(1L)).thenReturn(List.of());
        when(userMilestoneRepository.existsByUserIdAndMilestoneId(anyLong(), anyString())).thenReturn(false);
        when(learnerGoalsRepository.findById(1L)).thenReturn(Optional.empty());
    }

    @Test
    void profilePrioritizesDueMistakesForNextAction() {
        UserAnswer a = answer(51, 6, "{\"criteria_scores\":{\"ngu_phap\":6}}");
        when(userAnswerRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(a));

        Map<String, Object> profile = learnerProfileService.getProfile(1L);
        @SuppressWarnings("unchecked")
        Map<String, Object> action = (Map<String, Object>) profile.get("nextBestAction");

        assertEquals("review_mistakes", action.get("type"));
        assertEquals(2L, profile.get("dueMistakes"));
    }

    @Test
    void weakestQuestionUsesNormalizedAverage() {
        UserAnswer q51 = answer(51, 8, "{}");
        UserAnswer q53 = answer(53, 12, "{}");
        when(userAnswerRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(q53, q51));
        when(mistakeSrsService.countDueMistakes(1L)).thenReturn(0L);

        Map<String, Object> profile = learnerProfileService.getProfile(1L);

        assertEquals(53, profile.get("weakestQuestion"));
    }

    private static UserAnswer answer(int qNum, int score, String json) {
        UserAnswer a = new UserAnswer();
        a.setUserId(1L);
        a.setQuestionNumber(qNum);
        a.setScore(score);
        a.setAiFeedbackJson(json);
        a.setCreatedAt(LocalDate.now());
        return a;
    }
}
