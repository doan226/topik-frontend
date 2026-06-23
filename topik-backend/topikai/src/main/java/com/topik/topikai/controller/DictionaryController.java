package com.topik.topikai.controller;

import com.topik.topikai.service.DictionaryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/dict")
public class DictionaryController {

    @Autowired
    private DictionaryService dictionaryService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> lookup(@RequestParam String word) {
        return ResponseEntity.ok(dictionaryService.lookup(word));
    }
}
