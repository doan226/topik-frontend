package com.topik.topikai.controller;

import com.topik.topikai.dto.SubmitRequest;
import com.topik.topikai.security.SecurityUtils;
import com.topik.topikai.service.GradingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/topik")
public class SubmissionController {

    @Autowired
    private GradingService gradingService;

    @PostMapping("/submit")
    public ResponseEntity<?> submitWriting(@RequestBody SubmitRequest request) {
        Long userId = SecurityUtils.requireCurrentUserId();
        return gradingService.grade(request, userId);
    }
}
