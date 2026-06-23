import { useCallback, useState } from 'react';

const MAX_SELECTION_LEN = 30;

export interface SelectionAnchor {
  top: number;
  left: number;
}

export function useTextSelectionLookup() {
  const [selectedText, setSelectedText] = useState('');
  const [anchor, setAnchor] = useState<SelectionAnchor | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedText('');
    setAnchor(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const sel = window.getSelection()?.toString().trim() ?? '';
    if (!sel || sel.length > MAX_SELECTION_LEN) {
      if (!sel) {
        setSelectedText('');
        setAnchor(null);
      }
      return;
    }
    const range = window.getSelection()?.getRangeAt(0);
    const rect = range?.getBoundingClientRect();
    setSelectedText(sel);
    setAnchor(
      rect
        ? { top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX }
        : { top: e.clientY + window.scrollY, left: e.clientX + window.scrollX }
    );
  }, []);

  return { selectedText, anchor, handleMouseUp, clearSelection };
}
