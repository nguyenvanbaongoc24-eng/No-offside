# GIẤY PHÉP ÂM NHẠC & BẢN QUYỀN ÂM THANH (MUSIC & AUDIO LICENSES)

**Dự án:** No Offside - Video Hướng Dẫn Nhanh Sản Phẩm  
**Ngày khởi tạo:** 17/10/2026  
**Định dạng video:** Vertical 9:16 (1080×1920), MP4 H.264, 60fps / 30fps  

---

## 1. Nhạc nền (Background Music)

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Tên track** | *No Offside Athletic Drive (Sporty Upbeat Electronic Instrumental)* |
| **Tác giả / Nguồn** | Được tạo và tổng hợp thủ công qua script toán học thuật toán âm thanh chuyên dụng (`scripts/synth_music.py`) |
| **Phong cách** | Sporty, Upbeat, Electronic House, Driving Bassline (124 BPM, Key: A minor / F major) |
| **Thời lượng** | 62.5 giây |
| **Giấy phép (License)** | **CC0 1.0 Universal (Public Domain Dedication) / 100% Royalty-Free** |
| **Phạm vi sử dụng** | Được phép sử dụng thương mại, phi thương mại, biên tập, phân phối trên YouTube, TikTok, Facebook Reels, Instagram Reels và Website. Không yêu cầu phí bản quyền định kỳ. |
| **URL tham chiếu mã nguồn** | File cục bộ: `scripts/synth_music.py` |
| **Ngày tạo** | 17/10/2026 |

### Thông số kỹ thuật của bản nhạc
- Tần số lấy mẫu: 44,100 Hz, 16-bit PCM Stereo.
- Nhịp độ: 124 BPM.
- Kết cấu nhạc cụ số:
  - Kick drum: Sub sine frequency sweep 150 Hz -> 40 Hz kèm punch click.
  - Snare/Clap: White noise burst kết hợp 180 Hz body tone trên phách 2 và 4.
  - Hi-hat: 16th groove khép/mở stereo pan.
  - Driving Synth Bass: Tổng hợp sóng saw và sub-oscillator với dynamic decay envelope theo vòng hợp âm A minor - F major - D minor - G major.
  - Synth Arpeggio: Họa âm sin đa tầng stereo panning tạo cảm giác thể thao, bứt phá năng động.
  - Dynamic Audio Ducking: Tự động hạ âm lượng -15dB khi giọng đọc xuất hiện để đảm bảo lời nói luôn sắc nét, rõ ràng.

---

## 2. Giọng đọc thuyết minh (Voice-over)

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Tên giọng đọc** | `vi-VN-HoaiMyNeural` |
| **Công nghệ** | Neural Text-to-Speech Engine (Edge TTS) |
| **Ngôn ngữ** | Tiếng Việt (chuẩn giọng tự nhiên, thân thiện, rõ chữ) |
| **Tốc độ đọc** | +5% nhịp độ để giữ cảm giác thể thao linh hoạt |
| **Phạm vi bản quyền** | Cho phép tạo file âm thanh phục vụ trình bày tính năng sản phẩm phần mềm. |

---

## 3. Nội dung ghi công sẵn sàng chèn vào mô tả video (Attribution Snippet)

Khi đăng tải video lên YouTube, TikTok, Facebook hoặc Instagram, có thể dán đoạn văn bản sau vào phần mô tả (description):

```text
⚽ Video hướng dẫn sử dụng ứng dụng quản lý bóng đá phong trào No Offside
🌐 Trải nghiệm trực tiếp tại: https://no-offside.vercel.app/
🎵 Nhạc nền: No Offside Athletic Drive (Original Sporty Instrumental, CC0 Public Domain)
🎙 Giọng đọc: Tiếng Việt tự nhiên (Neural Speech Synthesis)
#NoOffside #QuanLyDoiBong #BongDaPhuoi #HenNhauRaSan
```

---

## 4. Tuyên bố miễn trừ trách nhiệm về Content ID của nền tảng

- Bản nhạc nền được tổng hợp thủ công trực tiếp từ thuật toán DSP (Digital Signal Processing) thuần túy trong mã nguồn dự án, **hoàn toàn không sử dụng bất kỳ mẫu sample hoặc loop âm thanh đã đăng ký bản quyền nào của bên thứ ba**.
- Tuy nhiên, theo thông lệ vận hành của các nền tảng video lớn (YouTube Content ID, Meta Rights Manager, TikTok Audio Match), các hệ thống tự động quét nhận dạng âm thanh đôi khi vẫn có thể đưa ra cảnh báo nhầm (false-positive claim) đối với các chuỗi nhịp điện tử thông dụng. Nếu phát sinh cảnh báo này, bạn hoàn toàn có thể sử dụng file mã nguồn `scripts/synth_music.py` và giấy phép CC0 để kháng nghị thành công.
