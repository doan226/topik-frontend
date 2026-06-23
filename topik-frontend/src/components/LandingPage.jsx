import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthScreen from '../AuthScreen';
import ThemeToggle from './ThemeToggle';
import '../styles/landing.css';

const FEATURES = [
  {
    id: 'writing',
    icon: '✍️',
    iconClass: 'blue',
    title: 'Luyện viết TOPIK hiệu quả',
    desc: 'Luyện câu 51–54 trên giấy OMR số, chấm điểm AI chi tiết theo tiêu chí chính thức. Cải thiện kỹ năng viết chỉ trong 3 tuần.',
    tag: 'live',
    tagLabel: 'Đang hoạt động',
    featured: true,
  },
  {
    id: 'listenread',
    icon: '🎧',
    iconClass: 'teal',
    title: 'Luyện Nghe & Đọc TOPIK II',
    desc: 'Audio tương tác, tra từ điển nhanh và giải thích tiếng Việt — 2–3 đề demo miễn phí.',
    tag: 'live',
    tagLabel: 'Đang hoạt động',
  },
  {
    id: 'hanhan',
    icon: '漢',
    iconClass: 'pink',
    title: 'Học từ Hán Hàn',
    desc: 'Tra cứu và ghi nhớ từ gốc Hán Việt giúp hiểu sâu nghĩa từ tiếng Hàn, mở rộng vốn từ nhanh hơn.',
    tag: 'live',
    tagLabel: 'Đang hoạt động',
  },
  {
    id: 'textbook',
    icon: '📚',
    iconClass: 'teal',
    title: 'Từ vựng & ngữ pháp sách tiếng Hàn',
    desc: 'Nội dung tổng hợp theo các giáo trình phổ biến: Seoul Korean, Yonsei, Ewha… kèm bài tập thực hành.',
    tag: 'soon',
    tagLabel: 'Sắp ra mắt',
  },
  {
    id: 'flashcard',
    icon: '🃏',
    iconClass: 'orange',
    title: 'Flashcard học từ vựng',
    desc: 'Học từ vựng theo phương pháp lặp lại ngắt quãng (SRS), phân cấp TOPIK I–II, theo chủ đề và sách giáo khoa.',
    tag: 'soon',
    tagLabel: 'Sắp ra mắt',
  },
];

const WHY_ITEMS = [
  'Chấm điểm AI chi tiết cho bài viết TOPIK câu 51–54 theo rubric chính thức.',
  'Luyện viết trên OMR số mô phỏng giấy thi thật, quen tay trước ngày thi.',
  'Theo dõi tiến độ học tập, lịch sử bài làm và điểm số qua bảng điều khiển cá nhân.',
  'Từ vựng câu 54 theo chủ đề + Hán Hàn pack riêng (79k).',
  'Cá nhân hóa lộ trình học dựa trên trình độ và kỹ năng yếu của từng người.',
];

const OMR_SAMPLE = '안녕하세요저는베트남에서왔습니다한국어를공부하고있습니다'.split('');

function OmrPreview() {
  const cells = Array.from({ length: 100 }, (_, i) => OMR_SAMPLE[i] || '');
  return (
    <div className="landing-omr-preview">
      <div className="landing-omr-title">TOPIK II · 쓰기 · Câu 53</div>
      <div className="landing-omr-grid">
        {cells.map((char, i) => (
          <div key={i} className={`landing-omr-cell${char ? ' filled' : ''}`}>
            {char}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage({ onLogin, showToast }) {
  const [showAuth, setShowAuth] = useState(false);

  const openAuth = () => setShowAuth(true);
  const closeAuth = () => setShowAuth(false);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-header-inner">
          <a href="#" className="landing-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <span className="landing-logo-icon">T</span>
            TOPIK AI
          </a>
          <nav className="landing-nav">
            <button type="button" className="landing-nav-link" onClick={() => scrollTo('features')}>
              Tính năng
            </button>
            <Link to="/pricing" className="landing-nav-link">Bảng giá</Link>
            <button type="button" className="landing-nav-link" onClick={() => scrollTo('why')}>
              Vì sao chọn chúng tôi
            </button>
            <ThemeToggle />
            <button type="button" className="landing-btn-login" onClick={openAuth}>
              Đăng nhập / Đăng ký
            </button>
          </nav>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-bg">
          <div className="landing-shape landing-shape-1" />
          <div className="landing-shape landing-shape-2" />
          <div className="landing-shape landing-shape-3" />
        </div>

        <div className="landing-hero-content">
          <div className="landing-badge">
            <span className="landing-badge-dot" />
            Nền tảng ôn thi TOPIK toàn diện
          </div>

          <h1 className="landing-hero-title">
            Ôn thi <span>TOPIK 쓰기</span>
            <br />
            hiệu quả nhất
          </h1>

          <p className="landing-hero-korean">토픽 쓰기 · Hán Hàn · Nghe · Đọc</p>

          <p className="landing-hero-sub">
            Chuyên sâu luyện viết TOPIK II (51–54) trên OMR số — chấm AI theo rubric chính thức,
            kèm Hán Hàn và luyện nghe–đọc bổ sung.
          </p>

          <div className="landing-hero-actions">
            <button type="button" className="landing-btn-primary" onClick={openAuth}>
              Bắt đầu luyện viết ngay →
            </button>
            <Link to="/pricing" className="landing-btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Xem bảng giá
            </Link>
          </div>

          <div className="landing-hero-stats">
            <div className="landing-stat">
              <span className="landing-stat-num">51–54</span>
              <span className="landing-stat-label">Câu viết TOPIK II</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat-num">AI</span>
              <span className="landing-stat-label">Chấm điểm tự động</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat-num">2</span>
              <span className="landing-stat-label">Chấm AI free/ngày</span>
            </div>
          </div>
        </div>

        <div className="landing-hero-visual">
          <div className="landing-hero-card">
            <OmrPreview />
            <ul className="landing-hero-checklist">
              <li>
                <span className="landing-check-icon primary">✍️</span>
                <span className="landing-check-label">
                  <strong className="highlight">쓰기 · Luyện viết TOPIK</strong>
                  <small>OMR số + chấm AI chi tiết</small>
                </span>
              </li>
              <li>
                <span className="landing-check-icon secondary">🎧</span>
                <span className="landing-check-label">
                  <strong>듣기 · Nghe</strong>
                  <small>Luyện theo dạng đề thi</small>
                </span>
              </li>
              <li>
                <span className="landing-check-icon secondary">📖</span>
                <span className="landing-check-label">
                  <strong>읽기 · Đọc</strong>
                  <small>Phân loại theo kỹ năng</small>
                </span>
              </li>
              <li>
                <span className="landing-check-icon secondary">📚</span>
                <span className="landing-check-label">
                  <strong>문법, 어휘 · Ngữ pháp & Từ vựng</strong>
                  <small>Flashcard & sách giáo khoa</small>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="landing-features" id="features">
        <div className="landing-section-header">
          <span className="landing-section-tag">Tính năng</span>
          <h2 className="landing-section-title">Mọi công cụ bạn cần để đạt TOPIK</h2>
          <p className="landing-section-desc">
            Tập trung vào kỹ năng viết — bổ sung đầy đủ công cụ học tiếng Hàn toàn diện
          </p>
        </div>

        <div className="landing-features-grid">
          {FEATURES.map((f) => (
            <article
              key={f.id}
              className={`landing-feature-card${f.featured ? ' featured' : ''}`}
            >
              <div className={`landing-feature-icon ${f.iconClass}`}>{f.icon}</div>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-desc">{f.desc}</p>
              <span className={`landing-feature-tag ${f.tag}`}>{f.tagLabel}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-why" id="why">
        <div className="landing-why-inner">
          <div className="landing-why-visual">
            <div className="landing-why-banner">토픽 합격하자!</div>
            <div className="landing-why-book">📖</div>
            <p className="landing-why-url">topik-ai-master.vn</p>
          </div>

          <div>
            <span className="landing-section-tag">Vì sao chọn chúng tôi</span>
            <h2 className="landing-section-title">
              Cải thiện khả năng làm bài thi TOPIK một cách hiệu quả nhất
            </h2>
            <p className="landing-section-desc" style={{ textAlign: 'left', marginBottom: 0 }}>
              Hệ thống chuyên nghiệp, giao diện thân thiện — theo dõi tiến độ từng kỹ năng và cấp độ.
            </p>
            <ul className="landing-why-list">
              {WHY_ITEMS.map((item, i) => (
                <li key={i}>
                  <span className="landing-why-bullet" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-cta-box">
          <h2 className="landing-cta-title">Sẵn sàng chinh phục TOPIK 쓰기?</h2>
          <p className="landing-cta-desc">
            Đăng ký miễn phí — bắt đầu luyện viết OMR và nhận chấm điểm AI ngay hôm nay.
          </p>
          <button type="button" className="landing-btn-primary" onClick={openAuth}>
            Bắt đầu ngay — Miễn phí
          </button>
        </div>
      </section>

      <footer className="landing-footer">
        <p>
          <strong>TOPIK AI</strong> — Chuyên sâu luyện viết TOPIK II · OMR · Hán Hàn
        </p>
      </footer>

      {showAuth && (
        <div className="landing-auth-overlay" onClick={closeAuth}>
          <div className="landing-auth-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="landing-auth-close" onClick={closeAuth} aria-label="Đóng">
              ×
            </button>
            <AuthScreen
              onLogin={(userData) => { closeAuth(); onLogin(userData); }}
              showToast={showToast}
              variant="modal"
            />
          </div>
        </div>
      )}
    </div>
  );
}
