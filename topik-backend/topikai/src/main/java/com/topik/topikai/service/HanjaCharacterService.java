package com.topik.topikai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.topik.topikai.dto.HanjaBankDto;
import com.topik.topikai.entity.HanjaCharacter;
import com.topik.topikai.repository.HanjaCharacterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class HanjaCharacterService {

    @Autowired
    private HanjaCharacterRepository repository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public Map<String, Object> upsertAll(List<HanjaBankDto.CharacterItem> items) {
        int inserted = 0;
        int updated = 0;
        Set<String> keepIds = new HashSet<>();

        for (HanjaBankDto.CharacterItem item : items) {
            if (item.getId() == null || item.getId().isBlank()) continue;
            String externalId = item.getId();
            keepIds.add(externalId);

            Optional<HanjaCharacter> existing = repository.findByExternalId(externalId);
            HanjaCharacter row = existing.orElseGet(HanjaCharacter::new);
            if (existing.isPresent()) {
                updated++;
            } else {
                inserted++;
            }
            applyItem(row, item, externalId);
            repository.save(row);
        }

        int deleted = 0;
        for (HanjaCharacter row : repository.findAll()) {
            if (row.getExternalId() != null && !keepIds.contains(row.getExternalId())) {
                repository.delete(row);
                deleted++;
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("inserted", inserted);
        result.put("updated", updated);
        result.put("deleted", deleted);
        result.put("total", keepIds.size());
        return result;
    }

    public List<Map<String, Object>> listAll() {
        return repository.findAllByOrderByReadingAscHanjaCharAsc().stream()
                .map(this::toMap)
                .collect(Collectors.toList());
    }

    public Optional<Map<String, Object>> getByExternalId(String externalId) {
        return repository.findByExternalId(externalId).map(this::toMap);
    }

    public long count() {
        return repository.count();
    }

    private void applyItem(HanjaCharacter row, HanjaBankDto.CharacterItem item, String externalId) {
        row.setExternalId(externalId);
        row.setHanjaChar(item.resolveChar());
        row.setReading(item.getReading() != null ? item.getReading() : "");
        row.setHanViet(item.getHanViet());
        row.setMeaningKo(item.getMeaningKo());
        row.setMeaningVi(item.getMeaningVi());
        row.setSource(item.getSource());
        row.setVerified(item.getVerified());
        try {
            row.setCompoundsJson(item.getCompounds() != null
                    ? objectMapper.writeValueAsString(item.getCompounds()) : "[]");
            row.setTopicsJson(item.getTopics() != null
                    ? objectMapper.writeValueAsString(item.getTopics()) : "[]");
        } catch (Exception e) {
            row.setCompoundsJson("[]");
            row.setTopicsJson("[]");
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> toMap(HanjaCharacter row) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", row.getExternalId());
        m.put("char", row.getHanjaChar());
        m.put("reading", row.getReading());
        m.put("hanViet", row.getHanViet());
        m.put("meaningKo", row.getMeaningKo());
        m.put("meaningVi", row.getMeaningVi());
        m.put("source", row.getSource());
        m.put("verified", row.getVerified());
        try {
            m.put("compounds", objectMapper.readValue(
                    row.getCompoundsJson() != null ? row.getCompoundsJson() : "[]",
                    new TypeReference<List<Map<String, String>>>() {}));
            m.put("topics", objectMapper.readValue(
                    row.getTopicsJson() != null ? row.getTopicsJson() : "[]",
                    new TypeReference<List<String>>() {}));
        } catch (Exception e) {
            m.put("compounds", List.of());
            m.put("topics", List.of());
        }
        return m;
    }
}
