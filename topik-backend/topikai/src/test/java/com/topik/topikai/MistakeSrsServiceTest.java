package com.topik.topikai;

import com.topik.topikai.service.MistakeSrsService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class MistakeSrsServiceTest {

    @Test
    void mistakeExternalRefIsStableAndUnique() {
        String ref1 = MistakeSrsService.mistakeExternalRef("할 예정이에요", "할 예정입니다");
        String ref2 = MistakeSrsService.mistakeExternalRef("할 예정이에요", "할 예정입니다");
        String ref3 = MistakeSrsService.mistakeExternalRef("다른", "đúng");

        assertTrue(ref1.startsWith("mistake:"));
        assertEquals(ref1, ref2);
        assertNotEquals(ref1, ref3);
    }
}
