import asyncio
import os
import sys
import subprocess
import edge_tts

sys.stdout.reconfigure(encoding='utf-8')

VOICE = "vi-VN-HoaiMyNeural"
AUDIO_DIR = "scripts/audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

SCRIPTS = {
    "00_intro": "Chào mừng bạn đến với No Offside. Ứng dụng quản lý đội bóng phong trào thông minh. Hẹn nhau ra sân!",
    "01_tao_doi": "Đầu tiên, khởi tạo đội bóng của bạn bằng cách nhập tên đội, chọn loại sân và nhấn Hoàn tất tạo đội.",
    "02_moi_thanh_vien": "Để mời đồng đội, chạm dấu cộng, chọn Mời thành viên rồi chia sẻ mã câu lạc bộ hoặc mã QR tiện lợi.",
    "03_tao_lich": "Tạo lịch thi đấu nhanh chóng với thông tin đối thủ, sân bóng, thời gian và thiết lập hạn chót điểm danh.",
    "04_diem_danh": "Thành viên chủ động điểm danh Có mặt hoặc Báo vắng ngay trên thẻ trận, giúp ban cán sự nắm chắc quân số.",
    "05_quan_ly_quy": "Mục Quỹ đội giúp thu chi minh bạch, theo dõi ai đã nộp và hỗ trợ quét mã VietQR chuyển khoản tức thì.",
    "06_outro": "Truy cập ngay no-offside.vercel.app. Tạo đội của bạn và hẹn nhau ra sân!"
}

async def generate():
    ffmpeg = r"C:\Users\LENOVO\AppData\Roaming\Python\Python314\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
    for key, text in SCRIPTS.items():
        out_path = os.path.join(AUDIO_DIR, f"{key}.mp3")
        comm = edge_tts.Communicate(text, VOICE, rate="+5%")
        await comm.save(out_path)
        
        # Get duration via ffmpeg
        res = subprocess.run([ffmpeg, "-i", out_path], capture_output=True, text=True)
        dur = 0.0
        for line in res.stderr.splitlines():
            if "Duration:" in line:
                part = line.split("Duration:")[1].split(",")[0].strip()
                h, m, s = part.split(":")
                dur = float(h)*3600 + float(m)*60 + float(s)
                break
        print(f"{key}: {dur:.2f}s - {text}")

if __name__ == "__main__":
    asyncio.run(generate())
