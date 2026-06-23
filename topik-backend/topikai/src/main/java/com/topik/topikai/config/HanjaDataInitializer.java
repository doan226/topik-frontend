package com.topik.topikai.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.topik.topikai.dto.HanjaBankDto;
import com.topik.topikai.service.HanjaCharacterService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.io.InputStream;

@Component
public class HanjaDataInitializer {

    @Autowired
    private HanjaCharacterService hanjaCharacterService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Async
    @EventListener(ApplicationReadyEvent.class)
    public void syncHanjaBank() {
        ClassPathResource resource = new ClassPathResource("hanja-bank.json");
        if (!resource.exists()) {
            return;
        }

        try (InputStream in = resource.getInputStream()) {
            HanjaBankDto bank = objectMapper.readValue(in, HanjaBankDto.class);
            if (bank.getCharacters() == null || bank.getCharacters().isEmpty()) {
                return;
            }
            hanjaCharacterService.upsertAll(bank.getCharacters());
        } catch (Exception e) {
            System.err.println("Hanja sync failed (non-fatal): " + e.getMessage());
        }
    }
}
