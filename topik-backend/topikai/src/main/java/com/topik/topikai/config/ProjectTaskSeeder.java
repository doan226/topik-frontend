package com.topik.topikai.config;

import com.topik.topikai.entity.ProjectTask;
import com.topik.topikai.entity.TaskStatus;
import com.topik.topikai.repository.ProjectTaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class ProjectTaskSeeder implements ApplicationRunner {

    @Autowired
    private ProjectTaskRepository repository;

    @Override
    public void run(ApplicationArguments args) {
        seedTask("db-project-task", "phase1-freemium",
                "Entity + seeder project_task",
                "ProjectTask entity, ProjectTaskRepository, ProjectTaskService, ProjectTaskSeeder",
                null, TaskStatus.pending);

        seedTask("db-practice-log", "phase1-freemium",
                "Entity practice_usage_log",
                "PracticeUsageLog entity + repository; extends UsageQuotaService for practice limits",
                null, TaskStatus.pending);

        seedTask("be-quota-extend", "phase1-freemium",
                "Mở rộng UsageQuotaService + quota API",
                "canUsePractice, consumePractice, getPracticeQuotaInfo merged into getQuotaInfo",
                "db-practice-log", TaskStatus.pending);

        seedTask("be-practice-api", "phase1-freemium",
                "PracticeController consume/can-use",
                "POST /practice/consume, GET /practice/can-use; extend GET /dashboard/quota",
                "be-quota-extend", TaskStatus.pending);

        seedTask("be-project-api", "phase1-freemium",
                "ProjectController CRUD + export",
                "GET/PATCH /project/tasks, POST /project/export-status",
                "db-project-task", TaskStatus.pending);

        seedTask("fe-config-tier", "phase1-freemium",
                "practiceFreeTier.js + usePracticeQuota",
                "src/config/practiceFreeTier.js, src/hooks/usePracticeQuota.js",
                "be-practice-api", TaskStatus.pending);

        seedTask("fe-app-wire", "phase1-freemium",
                "App.jsx truyền isPremium + upgrade",
                "Wire isPremium and onUpgradeClick to PatternPractice, Chart53Practice, Essay54Practice",
                "fe-config-tier", TaskStatus.pending);

        seedTask("fe-pattern-quota", "phase1-freemium",
                "PatternPractice exercise gating",
                "Consume exercise_51/exercise_52 quota on new exercise; show badge",
                "fe-app-wire", TaskStatus.pending);

        seedTask("fe-chart53-quota", "phase1-freemium",
                "Chart53Practice exam gating",
                "Consume chart53_exam when switching exam; 1/week free",
                "fe-app-wire", TaskStatus.pending);

        seedTask("fe-essay54-quota", "phase1-freemium",
                "Essay54Practice topic/quiz gating",
                "Free topics, expression kinds, quiz_54 daily limit",
                "fe-app-wire", TaskStatus.pending);

        seedTask("fe-saved-limit", "phase1-freemium",
                "Giới hạn 20 mục chưa thuộc",
                "savedPatterns5152.js + savedVocab54.js check savedLimit from quota API",
                "fe-app-wire", TaskStatus.pending);

        seedTask("fe-upgrade-copy", "phase1-freemium",
                "UpgradeModal + success modal copy",
                "Update copy: unlimited TOPIK writing practice",
                "fe-pattern-quota", TaskStatus.pending);

        seedTask("script-export-status", "phase1-freemium",
                "export-project-status.mjs + npm script",
                "scripts/export-project-status.mjs, npm run project:status",
                "be-project-api", TaskStatus.pending);

        seedTask("docs-impl-status", "phase1-freemium",
                "IMPLEMENTATION-STATUS.md lần export đầu",
                "docs/IMPLEMENTATION-STATUS.md auto-generated from project_task",
                "script-export-status", TaskStatus.pending);

        seedTask("test-quota-manual", "phase1-freemium",
                "Test guide quota free/premium",
                "Manual test checklist for free vs premium quota behavior",
                "fe-essay54-quota", TaskStatus.pending);

        seedTask("vocab-storefront", "phase2-vocab",
                "Catalog + payment SKU vocab packs",
                "Storefront tab, product catalog, Casso TOPIKVOCAB SKU",
                null, TaskStatus.deferred);

        seedTask("vocab-hanja-data", "phase2-vocab",
                "Data Hán Hàn pack",
                "Hán Hàn vocabulary content pack",
                "vocab-storefront", TaskStatus.deferred);
    }

    private void seedTask(String taskKey, String phase, String title, String description,
                          String dependsOn, TaskStatus status) {
        if (repository.existsByTaskKey(taskKey)) {
            return;
        }
        ProjectTask task = new ProjectTask();
        task.setTaskKey(taskKey);
        task.setPhase(phase);
        task.setTitle(title);
        task.setDescription(description);
        task.setDependsOn(dependsOn);
        task.setStatus(status);
        repository.save(task);
    }
}
