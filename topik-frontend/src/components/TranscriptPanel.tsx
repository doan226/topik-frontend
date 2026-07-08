import React, { useEffect, useRef } from 'react';
import { formatListenQuestionNo, TOPIK91_EXAM_META } from '../modules/lib/topik91ExamMeta';
import type { GlobalTimedLine, TimedTranscriptSection, TranscriptLine } from '../modules/lib/transcriptUtils';

interface TranscriptPanelSingleProps {
  mode: 'single';
  lines: TranscriptLine[];
  activeLineIndex: number;
  isLoading?: boolean;
  onLineClick?: (lineMs: number) => void;
  onTextMouseUp?: (e: React.MouseEvent) => void;
}

interface TranscriptPanelFullProps {
  mode: 'full';
  sections: TimedTranscriptSection[];
  activeSectionIndex: number;
  activeLineIndex: number;
  isLoading?: boolean;
  /** Dòng phụ đề mô tả số đoạn audio/câu (khác nhau giữa TOPIK I và II). */
  subtitle?: string;
  onLineClick?: (globalMs: number) => void;
  onTextMouseUp?: (e: React.MouseEvent) => void;
}

type TranscriptPanelProps = TranscriptPanelSingleProps | TranscriptPanelFullProps;

function LoadingState() {
  return (
    <div className="practice-card" style={{ padding: 16 }}>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--app-text-muted)' }}>Đang tải nội dung...</p>
    </div>
  );
}

function lineStyle(isActive: boolean, isPast: boolean): React.CSSProperties {
  return {
    padding: isActive ? '12px 14px' : '10px 12px',
    borderRadius: 10,
    background: isActive ? 'var(--app-surface-2)' : 'transparent',
    border: '1px solid transparent',
    borderLeft: isActive ? '3px solid var(--app-purple-text)' : '3px solid transparent',
    fontSize: isActive ? 15 : 14,
    fontWeight: isActive ? 700 : 400,
    lineHeight: 1.6,
    color: isActive ? 'var(--app-purple-text)' : 'var(--app-text-muted)',
    opacity: isActive ? 1 : isPast ? 0.45 : 0.6,
    boxShadow: isActive ? '0 1px 8px rgba(124, 92, 255, 0.18)' : 'none',
    transform: isActive ? 'scale(1.01)' : 'none',
    transformOrigin: 'left center',
    transition: 'opacity 0.25s ease, color 0.25s ease, background 0.25s ease, transform 0.2s ease, font-size 0.2s ease',
    cursor: 'pointer',
  };
}

function DialogueLines({
  lines,
  activeLineIndex,
  getSeekMs,
  onLineClick,
  activeRef,
  onTextMouseUp,
}: {
  lines: TranscriptLine[];
  activeLineIndex: number;
  getSeekMs: (line: TranscriptLine, idx: number) => number;
  onLineClick?: (ms: number) => void;
  activeRef?: React.RefObject<HTMLDivElement | null>;
  onTextMouseUp?: (e: React.MouseEvent) => void;
}) {
  const handleLineClick = (line: TranscriptLine, idx: number) => {
    const sel = window.getSelection()?.toString().trim();
    if (sel) return;
    onLineClick?.(getSeekMs(line, idx));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} onMouseUp={onTextMouseUp}>
      {lines.map((line, idx) => {
        const isActive = idx === activeLineIndex;
        const isPast = activeLineIndex >= 0 && idx < activeLineIndex;
        return (
          <div
            key={`${line.lineMs}-${idx}-${line.lineText.slice(0, 16)}`}
            ref={isActive ? activeRef : undefined}
            style={lineStyle(isActive, isPast)}
            onClick={() => handleLineClick(line, idx)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleLineClick(line, idx);
              }
            }}
          >
            {line.lineText}
          </div>
        );
      })}
    </div>
  );
}

export default function TranscriptPanel(props: TranscriptPanelProps) {
  const isLoading = props.isLoading ?? false;
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const activeKey =
    props.mode === 'single'
      ? `${props.activeLineIndex}`
      : `${props.activeSectionIndex}-${props.activeLineIndex}`;

  useEffect(() => {
    const c = scrollContainerRef.current;
    const a = activeLineRef.current;
    if (!c || !a) return;
    const cRect = c.getBoundingClientRect();
    const aRect = a.getBoundingClientRect();
    const delta = aRect.top - cRect.top - (c.clientHeight / 2 - aRect.height / 2);
    c.scrollTo({ top: c.scrollTop + delta, behavior: 'smooth' });
  }, [activeKey]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (props.mode === 'single') {
    if (props.lines.length === 0) {
      return <LoadingState />;
    }

    return (
      <div className="practice-card" style={{ padding: 16 }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--app-purple-text)' }}>
          Transcript câu hiện tại
        </p>
        <div ref={scrollContainerRef} style={{ maxHeight: 280, overflowY: 'auto' }} onMouseUp={props.onTextMouseUp}>
          <DialogueLines
            lines={props.lines}
            activeLineIndex={props.activeLineIndex}
            getSeekMs={(line) => line.lineMs}
            onLineClick={props.onLineClick}
            activeRef={activeLineRef}
            onTextMouseUp={props.onTextMouseUp}
          />
        </div>
      </div>
    );
  }

  if (props.sections.length === 0) {
    return <LoadingState />;
  }

  return (
    <div className="practice-card" style={{ padding: 16 }}>
      <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--app-purple-text)' }}>
        Transcript cả đề
      </p>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--app-text-muted)' }}>
        {props.subtitle ??
          `${TOPIK91_EXAM_META.listeningAudioSegmentCount} đoạn audio · ${TOPIK91_EXAM_META.listeningMcqCount} câu hỏi (câu 21–50 theo cặp)`}
      </p>
      <div ref={scrollContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 280, overflowY: 'auto' }} onMouseUp={props.onTextMouseUp}>
        {props.sections.map((section, sectionIdx) => {
          const isActiveSection = sectionIdx === props.activeSectionIndex;
          const lineActiveIndex = isActiveSection ? props.activeLineIndex : -1;
          return (
            <div key={section.questionNo}>
              <p
                style={{
                  margin: '0 0 8px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: isActiveSection ? 'var(--app-purple-text)' : 'var(--app-text-muted)',
                }}
              >
                Câu {formatListenQuestionNo(section.questionNo)}
              </p>
              <DialogueLines
                lines={section.lines}
                activeLineIndex={lineActiveIndex}
                getSeekMs={(line) => (line as GlobalTimedLine).globalMs}
                onLineClick={props.onLineClick}
                activeRef={isActiveSection ? activeLineRef : undefined}
                onTextMouseUp={props.onTextMouseUp}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
