package com.topik.topikai.service;

import com.topik.topikai.entity.User;
import com.topik.topikai.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SkuPaymentServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EntitlementService entitlementService;

    @InjectMocks
    private SkuPaymentService service;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    }

    @Test
    void extractUserId_parsesAfterKeyword() {
        assertEquals(42L, SkuPaymentService.extractUserId("TOPIKVIP 42 THANKS", "TOPIKVIP"));
        assertEquals(7L, SkuPaymentService.extractUserId("CHUYEN TOPIKVIET 7", "TOPIKVIET"));
        assertEquals(1L, SkuPaymentService.extractUserId("TOPIKALL USER 1", "TOPIKALL"));
    }

    @Test
    void extractUserId_returnsNullWhenMissing() {
        assertNull(SkuPaymentService.extractUserId("TOPIKVIP", "TOPIKVIP"));
        assertNull(SkuPaymentService.extractUserId("RANDOM TEXT", "TOPIKI"));
    }

    @Test
    void processPayment_topikviet() {
        Optional<PaymentMatch> match = service.processPayment("TOPIKVIET 1", 89000);
        assertTrue(match.isPresent());
        assertEquals("TOPIKVIET", match.get().skuCode());
        verify(entitlementService).grantWriting90Days(1L);
    }

    @Test
    void processPayment_topikvip_life() {
        Optional<PaymentMatch> match = service.processPayment("TOPIKVIP 1", 129000);
        assertTrue(match.isPresent());
        verify(entitlementService).grantWritingLife(1L);
    }

    @Test
    void processPayment_topiki() {
        Optional<PaymentMatch> match = service.processPayment("TOPIKI 1", 99000);
        assertTrue(match.isPresent());
        verify(entitlementService).grantTopik1(1L);
    }

    @Test
    void processPayment_topikhanja() {
        Optional<PaymentMatch> match = service.processPayment("TOPIKHANJA 1", 79000);
        assertTrue(match.isPresent());
        verify(entitlementService).grantHanja(1L);
    }

    @Test
    void processPayment_topikall() {
        Optional<PaymentMatch> match = service.processPayment("TOPIKALL 1", 189000);
        assertTrue(match.isPresent());
        verify(entitlementService).grantAllIn(1L);
    }

    @Test
    void processPayment_legacy_50k() {
        Optional<PaymentMatch> match = service.processPayment("TOPIKVIP 1", 50000);
        assertTrue(match.isPresent());
        verify(entitlementService).grantLegacyPremium(1L);
    }

    @Test
    void processPayment_rejects_underpaid() {
        assertFalse(service.processPayment("TOPIKVIP 1", 40000).isPresent());
        verify(entitlementService, never()).grantWritingLife(anyLong());
        verify(entitlementService, never()).grantLegacyPremium(anyLong());
    }

    @Test
    void processPayment_topikall_before_topiki() {
        Optional<PaymentMatch> match = service.processPayment("TOPIKALL 1", 189000);
        assertEquals("TOPIKALL", match.get().skuCode());
        verify(entitlementService).grantAllIn(1L);
        verify(entitlementService, never()).grantTopik1(anyLong());
    }
}
