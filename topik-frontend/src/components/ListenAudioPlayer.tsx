import React, { forwardRef, useEffect, useState } from 'react';

export const PLAYBACK_RATES = [0.8, 1, 1.2] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

interface ListenAudioPlayerProps {
  src: string;
  audioKey: string;
  playbackRate: PlaybackRate;
  currentTimeMs: number;
  durationMs: number;
  onSeek: (ms: number) => void;
  onSeekStart?: () => void;
  onSeekEnd?: () => void;
  onPlaybackRateChange: (rate: PlaybackRate) => void;
  onTimeUpdate: (timeMs: number) => void;
  onDurationChange: (durationMs: number) => void;
  onSkipPrev: () => void;
  onSkipNext: () => void;
  canSkipPrev?: boolean;
  canSkipNext?: boolean;
}

function formatClock(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const ListenAudioPlayer = forwardRef<HTMLAudioElement, ListenAudioPlayerProps>(
  function ListenAudioPlayer(
    {
      src,
      audioKey,
      playbackRate,
      currentTimeMs,
      durationMs,
      onSeek,
      onSeekStart,
      onSeekEnd,
      onPlaybackRateChange,
      onTimeUpdate,
      onDurationChange,
      onSkipPrev,
      onSkipNext,
      canSkipPrev = true,
      canSkipNext = true,
    },
    ref
  ) {
    const [isPlaying, setIsPlaying] = useState(false);
    const isScrubbingRef = React.useRef(false);

    const handleSeek = (val: number) => {
      onSeek(val);
    };

    const endScrub = () => {
      if (!isScrubbingRef.current) return;
      isScrubbingRef.current = false;
      onSeekEnd?.();
    };

    const getAudio = (): HTMLAudioElement | null =>
      typeof ref === 'function' ? null : ref?.current ?? null;

    useEffect(() => {
      const audio = getAudio();
      if (audio) audio.playbackRate = playbackRate;
    }, [playbackRate, ref, audioKey]);

    useEffect(() => {
      setIsPlaying(false);
    }, [audioKey]);

    const togglePlay = () => {
      const audio = getAudio();
      if (!audio) return;
      if (audio.paused) {
        void audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    };

    const safeDuration = durationMs > 0 ? durationMs : 0;
    const progressPct = safeDuration > 0 ? Math.min(100, (currentTimeMs / safeDuration) * 100) : 0;

    return (
      <div className="practice-card" style={{ padding: 16 }}>
        <audio
          key={audioKey}
          ref={ref}
          src={src}
          onLoadedMetadata={(e) => {
            const el = e.currentTarget;
            el.playbackRate = playbackRate;
            onDurationChange(Math.floor(el.duration * 1000));
          }}
          onTimeUpdate={(e) => {
            if (isScrubbingRef.current) return;
            onTimeUpdate(Math.floor(e.currentTarget.currentTime * 1000));
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          style={{ display: 'none' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className="practice-nav-btn"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
            style={{
              width: 44,
              height: 44,
              minWidth: 44,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              padding: 0,
            }}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              type="range"
              min={0}
              max={safeDuration || 1}
              step={100}
              value={Math.min(currentTimeMs, safeDuration || 1)}
              onPointerDown={() => {
                isScrubbingRef.current = true;
                onSeekStart?.();
              }}
              onPointerUp={endScrub}
              onPointerCancel={endScrub}
              onChange={(e) => handleSeek(Number(e.currentTarget.value))}
              onInput={(e) => handleSeek(Number(e.currentTarget.value))}
              aria-label="Thanh tua âm thanh"
              style={{
                width: '100%',
                accentColor: 'var(--app-purple-text)',
                cursor: 'pointer',
                background: `linear-gradient(to right, var(--app-purple-text) ${progressPct}%, var(--app-surface-2) ${progressPct}%)`,
                borderRadius: 999,
                height: 6,
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: 'var(--app-text-muted)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span>{formatClock(currentTimeMs)}</span>
              <span>{formatClock(safeDuration)}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--app-text-muted)', marginRight: 4 }}>Tốc độ:</span>
            {PLAYBACK_RATES.map((rate) => (
              <button
                key={rate}
                type="button"
                className={`hanja-hub-chip${playbackRate === rate ? ' hanja-hub-chip--active' : ''}`}
                onClick={() => onPlaybackRateChange(rate)}
              >
                {rate}x
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--app-text-muted)', marginRight: 4 }}>Đoạn:</span>
            <button
              type="button"
              className="practice-nav-btn"
              disabled={!canSkipPrev}
              onClick={onSkipPrev}
            >
              ← Đoạn trước
            </button>
            <button
              type="button"
              className="practice-nav-btn"
              disabled={!canSkipNext}
              onClick={onSkipNext}
            >
              Đoạn sau →
            </button>
          </div>
        </div>
      </div>
    );
  }
);

export default ListenAudioPlayer;
