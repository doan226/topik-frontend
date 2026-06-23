package com.topik.topikai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class HanjaBankDto {

    private Meta meta;
    private List<Pack> packs;
    private List<CharacterItem> characters;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Meta {
        private int version;
        private String title;
        private String updated;
        private String source;
        private Integer characterCount;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Pack {
        private String packId;
        private String titleVi;
        private String access;
        private List<String> charIds;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CharacterItem {
        private String id;

        @JsonProperty("char")
        private String charValue;

        private String reading;
        private List<String> readingsAlt;
        private String meaningKo;
        private String meaningVi;
        private String hanViet;
        private List<String> topics;
        private List<Map<String, String>> compounds;
        private String source;
        private String verified;

        public String resolveChar() {
            if (charValue != null && !charValue.isBlank()) return charValue;
            return "";
        }
    }
}
