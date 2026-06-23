export type ListenSection = 'listening' | 'reading';
export type ListenMode = 'full' | 'single';

export interface ListenReadResume {
  examId: string;
  section: ListenSection;
  listenMode: ListenMode;
  showTranscript: boolean;
  currentIndex: number;
  updatedAt: string;
}

const PREFIX = 'topik_lr_resume_';

export function loadListenReadResume(userId: number | string): ListenReadResume | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveListenReadResume(userId: number | string, state: ListenReadResume) {
  if (!userId) return;
  localStorage.setItem(`${PREFIX}${userId}`, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }));
}

export function clearListenReadResume(userId: number | string) {
  if (!userId) return;
  localStorage.removeItem(`${PREFIX}${userId}`);
}
