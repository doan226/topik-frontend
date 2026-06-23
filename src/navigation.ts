export type WritingMode = 'theory' | 'omr';

export type QuestionType = 51 | 52 | 53 | 54;

export type WritingTabId = 'writing51' | 'writing52' | 'writing53' | 'writing54';

export type TabId = 'dashboard' | WritingTabId | 'hanja' | 'listenread';

export const WRITING_TABS: WritingTabId[] = ['writing51', 'writing52', 'writing53', 'writing54'];

export interface WritingTabMeta {
  tabId: WritingTabId;
  questionType: QuestionType;
  label: string;
  title: string;
  highlight: string;
  subtitle: string;
}

export const WRITING_TAB_META: Record<WritingTabId, WritingTabMeta> = {
  writing51: {
    tabId: 'writing51',
    questionType: 51,
    label: 'Câu 51',
    title: 'Ôn luyện',
    highlight: 'Câu 51',
    subtitle: 'Thông báo, email, quảng cáo — flashcard biểu hiện, từ vựng và bài điền từ.',
  },
  writing52: {
    tabId: 'writing52',
    questionType: 52,
    label: 'Câu 52',
    title: 'Ôn luyện',
    highlight: 'Câu 52',
    subtitle: 'Luận điển — liên từ, ngữ pháp và bài luyện điền từ từ Quyển Viết.',
  },
  writing53: {
    tabId: 'writing53',
    questionType: 53,
    label: 'Câu 53',
    title: 'Luyện viết',
    highlight: 'Câu 53',
    subtitle: 'Mô tả biểu đồ — công thức viết và 14 đề luyện.',
  },
  writing54: {
    tabId: 'writing54',
    questionType: 54,
    label: 'Câu 54',
    title: 'Luyện viết',
    highlight: 'Câu 54',
    subtitle: 'Từ vựng, biểu hiện và quiz theo chủ đề luận TOPIK II.',
  },
};

export function getWritingTabForQuestion(questionType: number): WritingTabId | null {
  const entry = WRITING_TABS.find(
    (tab) => WRITING_TAB_META[tab].questionType === questionType
  );
  return entry ?? null;
}

export function getWritingMeta(tabId: WritingTabId): WritingTabMeta {
  return WRITING_TAB_META[tabId];
}

export function isWritingTab(tab: string): tab is WritingTabId {
  return WRITING_TABS.includes(tab as WritingTabId);
}

export type NavIntent = {
  tab: TabId;
  writingMode?: WritingMode;
  initialTopik?: number;
};

const TAB_PATHS: Record<Exclude<TabId, WritingTabId>, string> = {
  dashboard: '/dashboard',
  hanja: '/hanja',
  listenread: '/listenread',
};

export function pathForTab(tab: TabId, mode?: WritingMode): string {
  if (isWritingTab(tab)) {
    const q = WRITING_TAB_META[tab].questionType;
    return mode === 'omr' ? `/writing/${q}/omr` : `/writing/${q}`;
  }
  return TAB_PATHS[tab];
}

export function tabFromPath(pathname: string): TabId | null {
  if (pathname === '/' || pathname === '/dashboard') return 'dashboard';
  if (pathname === '/hanja') return 'hanja';
  if (pathname === '/listenread' || pathname.startsWith('/listenread/')) return 'listenread';
  const writingMatch = pathname.match(/^\/writing\/(51|52|53|54)(?:\/omr)?$/);
  if (writingMatch) {
    return `writing${writingMatch[1]}` as WritingTabId;
  }
  return null;
}

export function writingModeFromPath(pathname: string): WritingMode | null {
  if (/\/omr$/.test(pathname)) return 'omr';
  const writingMatch = pathname.match(/^\/writing\/(51|52|53|54)$/);
  if (writingMatch) return 'theory';
  return null;
}

export function questionTypeFromPath(pathname: string): QuestionType | null {
  const m = pathname.match(/^\/writing\/(51|52|53|54)/);
  if (!m) return null;
  return Number(m[1]) as QuestionType;
}

export type ListenReadSub = 'topik2' | 'topik1';

export function listenReadSubFromPath(pathname: string): ListenReadSub {
  if (pathname.startsWith('/listenread/topik1')) return 'topik1';
  return 'topik2';
}

export function pathForListenReadSub(sub: ListenReadSub): string {
  return sub === 'topik1' ? '/listenread/topik1' : '/listenread';
}

export const PRICING_PATH = '/pricing';

export function isPricingPath(pathname: string): boolean {
  return pathname === PRICING_PATH;
}
