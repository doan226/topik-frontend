package com.topik.topikai.service;

import com.topik.topikai.entity.HanjaPackUnlock;
import com.topik.topikai.repository.HanjaPackUnlockRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class HanjaPackService {

    public static final int HANJA_PACK_PRICE = EntitlementService.PRICE_HANJA;

    @Autowired
    private HanjaPackUnlockRepository hanjaPackUnlockRepository;

    public List<String> getUnlockedPackIds(Long userId) {
        return hanjaPackUnlockRepository.findByUserId(userId).stream()
                .map(HanjaPackUnlock::getPackId)
                .collect(Collectors.toList());
    }

    public boolean isPackUnlocked(Long userId, String packId) {
        return hanjaPackUnlockRepository.existsByUserIdAndPackId(userId, packId);
    }

    @Transactional
    public HanjaPackUnlock unlockPack(Long userId, String packId) {
        return hanjaPackUnlockRepository.findByUserIdAndPackId(userId, packId)
                .orElseGet(() -> {
                    HanjaPackUnlock unlock = new HanjaPackUnlock();
                    unlock.setUserId(userId);
                    unlock.setPackId(packId);
                    return hanjaPackUnlockRepository.save(unlock);
                });
    }
}
