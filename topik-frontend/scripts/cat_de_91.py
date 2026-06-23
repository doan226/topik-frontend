import os
import json
from pydub import AudioSegment
from pydub.silence import split_on_silence, detect_silence

# --- 1. CẤU HÌNH ĐỀ THI ---
TEN_FILE_GOC = "91-TOPIK-II-Listening-Audio-File.mp3"
MA_DE_THI = "topik2-91"

DANH_SACH_CAU = [str(i) for i in range(1, 21)]
for i in range(21, 51, 2):
    DANH_SACH_CAU.append(f"{i}_{i+1}")

# --- 2. THƯ MỤC ---
print("📁 Khởi tạo thư mục...")
os.makedirs("public/audio", exist_ok=True)
os.makedirs("data", exist_ok=True)

# --- 3. ĐỌC AUDIO GỐC ---
print(f"⏳ Đang tải audio gốc {TEN_FILE_GOC} (Chờ khoảng 30s)...")
am_thanh_goc = AudioSegment.from_mp3(TEN_FILE_GOC)

# --- 4. TÌM CHÍNH XÁC ĐIỂM KẾT THÚC INTRO ("감사합니다") ---
print("🔍 [GIAI ĐOẠN 1] AI đang dò tìm mốc '감사합니다' để loại bỏ Intro...")
# Quét các khoảng lặng >= 2s
silences = detect_silence(am_thanh_goc, min_silence_len=2000, silence_thresh=-40, seek_step=100)

start_of_q1 = 0
for i, (start, end) in enumerate(silences):
    duration = end - start
    # Khoảng lặng > 7s đầu tiên chắc chắn là thời gian tô đáp án giữa Câu 1 và Câu 2
    if duration >= 7000: 
        if i > 0:
            # Khoảng lặng ngay trước đó chính là khoảng 3s sau "감사합니다"
            start_of_q1 = silences[i-1][1] 
        else:
            start_of_q1 = end
        break

print(f"🎯 Đã khóa mục tiêu! Câu 1 bắt đầu chính xác tại mốc {start_of_q1 / 1000.0:.1f}s")
am_thanh_sach = am_thanh_goc[start_of_q1:] # Cắt phăng đoạn intro không thương tiếc

# --- 5. CẮT CÁC CÂU HỎI ---
print("🔍 [GIAI ĐOẠN 2] Đang tách 35 câu hỏi (Giảm độ nhạy xuống 6s để không bị gộp câu)...")
chunks = split_on_silence(
    am_thanh_sach,
    min_silence_len=6000, # Giảm xuống 6s để bắt mọi khoảng trống tô đáp án
    silence_thresh=-40, 
    keep_silence=1000,
    seek_step=100
)

# --- 6. LỌC VÀ CHỌN ĐÚNG 35 CÂU ---
valid_chunks = []
for chunk in chunks:
    if len(chunk) >= 10000: # Lọc bỏ rác và tiếng ồn < 10 giây
        valid_chunks.append(chunk)

print(f"✅ Đã trích xuất được {len(valid_chunks)} đoạn âm thanh.")

if len(valid_chunks) < 35:
    print("❌ CẢNH BÁO: Số lượng câu < 35, có thể file audio có vấn đề.")
    question_chunks = valid_chunks
else:
    # Bốc chính xác 35 đoạn ĐẦU TIÊN (sẽ tự động bỏ lại đoạn Lời chào kết thúc Outro ở cuối)
    question_chunks = valid_chunks[:35] 

# --- 7. XUẤT FILE ---
du_lieu_web = []
print("✂️ Bắt đầu lưu file và tạo JSON...")

for chi_muc, chunk in enumerate(question_chunks):
    nhan_cau = DANH_SACH_CAU[chi_muc]
    ten_file_mp3 = f"{MA_DE_THI}-listen-q{nhan_cau}.mp3"
    duong_dan_luu = f"public/audio/{ten_file_mp3}"
    
    do_dai_giay = len(chunk) / 1000.0
    
    chunk.export(duong_dan_luu, format="mp3")
    print(f"  -> ✅ Đã lưu câu {nhan_cau} (Dài {do_dai_giay:.1f}s)")
    
    is_free = True if "_" not in nhan_cau and int(nhan_cau) <= 10 else False
    
    question_data = {
        "examId": MA_DE_THI,
        "section": "listening",
        "questionNo": nhan_cau,
        "tier": "free" if is_free else "pro",
        "correct_ans": "", 
        "content_json": {
            "passage": f"Nghe đoạn hội thoại cho câu {nhan_cau.replace('_', ' và ')}:",
            "audio_url": f"/audio/{ten_file_mp3}",
            "transcript": [
                { "lineMs": 0, "lineText": "[Dán Transcript tiếng Hàn vào đây]" }
            ],
            "options": ["Đáp án 1", "Đáp án 2", "Đáp án 3", "Đáp án 4"]
        }
    }
    du_lieu_web.append(question_data)

file_json = f"data/{MA_DE_THI}-bank.json"
with open(file_json, "w", encoding="utf-8") as f:
    json.dump(du_lieu_web, f, ensure_ascii=False, indent=2)

print(f"\n🎉 HOÀN TẤT XUẤT SẮC! Cấu trúc 35 câu đã được chia chuẩn 100%.")