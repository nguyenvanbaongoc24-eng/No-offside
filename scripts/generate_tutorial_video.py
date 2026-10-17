import os
import sys
import math
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

sys.stdout.reconfigure(encoding='utf-8')

FFMPEG = r"C:\Users\LENOVO\AppData\Roaming\Python\Python314\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
AUDIO_MIX = "scripts/audio/final_audio_mix.wav"
OUTPUT_MP4 = "no_offside_tutorial_pro.mp4"

WIDTH, HEIGHT = 1080, 1920
FPS = 30
TOTAL_DURATION = 61.5
TOTAL_FRAMES = int(FPS * TOTAL_DURATION)

# Styling Constants
BG_DARK = (8, 16, 12, 255)
BG_GRAD_END = (14, 38, 26, 255)
GREEN_PRIMARY = (19, 124, 52)
GREEN_ACCENT = (16, 185, 129)
GREEN_GLOW = (52, 211, 153)
WHITE = (255, 255, 255)
TEXT_MUTED = (160, 175, 168)
GLASS_BG = (10, 22, 17, 220)
GLASS_BORDER = (16, 185, 129, 90)

FONT_BOLD = r"C:\Windows\Fonts\segoeuib.ttf"
FONT_REG = r"C:\Windows\Fonts\segoeui.ttf"

def draw_tactical_pitch(draw, opacity=0.20):
    c = (255, 255, 255, int(255 * opacity))
    cg = (16, 185, 129, int(255 * opacity * 1.3))
    
    draw.rectangle([60, 180, WIDTH - 60, HEIGHT - 180], outline=c, width=3)
    mid_y = HEIGHT // 2
    draw.line([(60, mid_y), (WIDTH - 60, mid_y)], fill=c, width=3)
    draw.ellipse([WIDTH//2 - 160, mid_y - 160, WIDTH//2 + 160, mid_y + 160], outline=cg, width=3)
    draw.ellipse([WIDTH//2 - 6, mid_y - 6, WIDTH//2 + 6, mid_y + 6], fill=cg)
    
    draw.rectangle([WIDTH//2 - 260, 180, WIDTH//2 + 260, 480], outline=c, width=3)
    draw.rectangle([WIDTH//2 - 140, 180, WIDTH//2 + 140, 320], outline=c, width=2)
    draw.arc([WIDTH//2 - 110, 400, WIDTH//2 + 110, 560], start=20, end=160, fill=c, width=2)
    
    draw.rectangle([WIDTH//2 - 260, HEIGHT - 480, WIDTH//2 + 260, HEIGHT - 180], outline=c, width=3)
    draw.rectangle([WIDTH//2 - 140, HEIGHT - 320, WIDTH//2 + 140, HEIGHT - 180], outline=c, width=2)
    draw.arc([WIDTH//2 - 110, HEIGHT - 560, WIDTH//2 + 110, HEIGHT - 400], start=200, end=340, fill=c, width=2)

def draw_gradient_background():
    img = Image.new("RGBA", (WIDTH, HEIGHT), BG_DARK)
    draw = ImageDraw.Draw(img)
    for y in range(HEIGHT):
        ratio = y / HEIGHT
        r = int(BG_DARK[0] * (1 - ratio) + BG_GRAD_END[0] * ratio)
        g = int(BG_DARK[1] * (1 - ratio) + BG_GRAD_END[1] * ratio)
        b = int(BG_DARK[2] * (1 - ratio) + BG_GRAD_END[2] * ratio)
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b, 255))
    return img

# Pre-cache base frames
BASE_BG = draw_gradient_background()
PITCH_OVERLAY = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
draw_tactical_pitch(ImageDraw.Draw(PITCH_OVERLAY), opacity=0.18)
BASE_BG_PITCH = Image.alpha_composite(BASE_BG, PITCH_OVERLAY)

LOGO_IMG = Image.open("public/pwa-512x512.png").convert("RGBA")

def render_intro_frame(t):
    img = BASE_BG_PITCH.copy()
    
    # Logo entrance scale animation (from 0.85 to 1.0)
    progress = min(1.0, t / 1.5)
    scale = 0.85 + 0.15 * (1.0 - math.cos(progress * math.pi / 2))
    logo_sz = int(240 * scale)
    logo_resized = LOGO_IMG.resize((logo_sz, logo_sz), Image.Resampling.LANCZOS)
    
    # Glow
    glow_sz = logo_sz + 40
    glow = Image.new("RGBA", (glow_sz, glow_sz), (0, 0, 0, 0))
    dg = ImageDraw.Draw(glow)
    dg.ellipse([10, 10, glow_sz - 10, glow_sz - 10], fill=(16, 185, 129, 70))
    glow = glow.filter(ImageFilter.GaussianBlur(15))
    
    img.paste(glow, (WIDTH//2 - glow_sz//2, 520 - glow_sz//2), glow)
    img.paste(logo_resized, (WIDTH//2 - logo_sz//2, 520 - logo_sz//2), logo_resized)
    
    draw = ImageDraw.Draw(img)
    font_brand = ImageFont.truetype(FONT_BOLD, 74)
    font_tag = ImageFont.truetype(FONT_REG, 38)
    font_title = ImageFont.truetype(FONT_BOLD, 46)
    
    draw.text((WIDTH//2, 800), "NO OFFSIDE", font=font_brand, fill=WHITE, anchor="mm")
    draw.text((WIDTH//2, 870), "Hẹn nhau ra sân.", font=font_tag, fill=GREEN_GLOW, anchor="mm")
    
    # Title badge pill
    pill_w, pill_h = 760, 80
    pill_x = WIDTH//2 - pill_w//2
    pill_y = 980
    pill = Image.new("RGBA", (pill_w, pill_h), (0, 0, 0, 0))
    dp = ImageDraw.Draw(pill)
    dp.rounded_rectangle([0, 0, pill_w, pill_h], radius=40, fill=GLASS_BG, outline=GLASS_BORDER, width=2)
    dp.text((pill_w//2, pill_h//2), "HƯỚNG DẪN SỬ DỤNG NHANH", font=font_title, fill=WHITE, anchor="mm")
    img.paste(pill, (pill_x, pill_y), pill)
    
    # Subtitle
    sub_w, sub_h = 980, 96
    sub_x = WIDTH//2 - sub_w//2
    sub_y = 1680
    draw.rounded_rectangle([sub_x, sub_y, sub_x + sub_w, sub_y + sub_h], radius=24, fill=(6, 14, 10, 245), outline=(16, 185, 129, 140), width=2)
    font_sub = ImageFont.truetype(FONT_REG, 28)
    draw.text((WIDTH//2, sub_y + sub_h//2), "Chào mừng bạn đến với No Offside.", font=font_sub, fill=WHITE, anchor="mm")
    
    return img

def render_title_card(chapter, title, subtitle_card):
    img = BASE_BG_PITCH.copy()
    draw = ImageDraw.Draw(img)
    
    badge_w, badge_h = 240, 60
    bx = WIDTH//2 - badge_w//2
    by = 700
    badge = Image.new("RGBA", (badge_w, badge_h), (0, 0, 0, 0))
    db = ImageDraw.Draw(badge)
    db.rounded_rectangle([0, 0, badge_w, badge_h], radius=30, fill=(16, 185, 129, 45), outline=GREEN_ACCENT, width=2)
    font_badge = ImageFont.truetype(FONT_BOLD, 28)
    db.text((badge_w//2, badge_h//2), f"CHƯƠNG {chapter}", font=font_badge, fill=GREEN_GLOW, anchor="mm")
    img.paste(badge, (bx, by), badge)
    
    font_title = ImageFont.truetype(FONT_BOLD, 68)
    draw.text((WIDTH//2, 830), title, font=font_title, fill=WHITE, anchor="mm")
    
    font_sub = ImageFont.truetype(FONT_REG, 32)
    draw.text((WIDTH//2, 910), subtitle_card, font=font_sub, fill=TEXT_MUTED, anchor="mm")
    return img

def render_outro_frame():
    img = BASE_BG_PITCH.copy()
    logo_sz = 240
    logo_resized = LOGO_IMG.resize((logo_sz, logo_sz), Image.Resampling.LANCZOS)
    img.paste(logo_resized, (WIDTH//2 - logo_sz//2, 480), logo_resized)
    
    draw = ImageDraw.Draw(img)
    font_brand = ImageFont.truetype(FONT_BOLD, 74)
    font_tag = ImageFont.truetype(FONT_REG, 38)
    font_url = ImageFont.truetype(FONT_BOLD, 36)
    font_cta = ImageFont.truetype(FONT_BOLD, 40)
    
    draw.text((WIDTH//2, 780), "NO OFFSIDE", font=font_brand, fill=WHITE, anchor="mm")
    draw.text((WIDTH//2, 850), "Hẹn nhau ra sân.", font=font_tag, fill=GREEN_GLOW, anchor="mm")
    draw.text((WIDTH//2, 940), "https://no-offside.vercel.app/", font=font_url, fill=(160, 230, 200), anchor="mm")
    
    btn_w, btn_h = 800, 90
    bx = WIDTH//2 - btn_w//2
    by = 1040
    btn = Image.new("RGBA", (btn_w, btn_h), (0, 0, 0, 0))
    db = ImageDraw.Draw(btn)
    db.rounded_rectangle([0, 0, btn_w, btn_h], radius=45, fill=(19, 124, 52, 255), outline=GREEN_GLOW, width=3)
    db.text((btn_w//2, btn_h//2), "Tạo đội của bạn. Hẹn nhau ra sân.", font=font_cta, fill=WHITE, anchor="mm")
    img.paste(btn, (bx, by), btn)
    
    # Subtitle
    sub_w, sub_h = 980, 96
    sub_x = WIDTH//2 - sub_w//2
    sub_y = 1680
    draw.rounded_rectangle([sub_x, sub_y, sub_x + sub_w, sub_y + sub_h], radius=24, fill=(6, 14, 10, 245), outline=(16, 185, 129, 140), width=2)
    font_sub = ImageFont.truetype(FONT_REG, 28)
    draw.text((WIDTH//2, sub_y + sub_h//2), "Truy cập ngay no-offside.vercel.app. Tạo đội của bạn và hẹn nhau ra sân!", font=font_sub, fill=WHITE, anchor="mm")
    return img

# Pre-render static composites without touch pulses
ACTION_BASES = {}
RAW_IMAGES = {}

def get_raw_image(path):
    if path not in RAW_IMAGES:
        RAW_IMAGES[path] = Image.open(path).convert("RGBA")
    return RAW_IMAGES[path]

def create_action_base(image_path, chapter_badge, step_text, subtitle, sub_y):
    base = get_raw_image(image_path).copy()
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    
    # Top HUD
    hud_h = 135
    d.rectangle([0, 0, WIDTH, hud_h], fill=(7, 16, 12, 255))
    d.line([(0, hud_h), (WIDTH, hud_h)], fill=(16, 185, 129, 200), width=3)
    
    font_chap = ImageFont.truetype(FONT_BOLD, 22)
    font_step = ImageFont.truetype(FONT_BOLD, 32)
    
    badge_w = 290
    d.rounded_rectangle([40, 20, 40 + badge_w, 58], radius=19, fill=(16, 185, 129, 45), outline=GREEN_ACCENT, width=2)
    d.text((40 + badge_w//2, 39), chapter_badge, font=font_chap, fill=GREEN_GLOW, anchor="mm")
    d.text((40, 94), step_text, font=font_step, fill=WHITE, anchor="lm")
    
    # Subtitle box
    if subtitle:
        sub_w, sub_h = 980, 96
        sub_x = WIDTH//2 - sub_w//2
        d.rounded_rectangle([sub_x, sub_y, sub_x + sub_w, sub_y + sub_h], radius=24, fill=(6, 14, 10, 245), outline=(16, 185, 129, 140), width=2)
        font_sub = ImageFont.truetype(FONT_REG, 28)
        d.text((WIDTH//2, sub_y + sub_h//2), subtitle, font=font_sub, fill=WHITE, anchor="mm")
        
    return Image.alpha_composite(base, overlay)

TIMELINE = [
    # 0. Intro A: Logo Reveal (0.0s to 4.0s)
    {
        "type": "intro_logo",
        "start": 0.0,
        "end": 4.0
    },
    # 1. Intro B: Dashboard overview (4.0s to 8.0s)
    {
        "type": "action",
        "start": 4.0,
        "end": 8.0,
        "image": "scripts/frames_raw/dashboard_main.png",
        "chapter_badge": "TỔNG QUAN NO OFFSIDE",
        "step_text": "Chào mừng đến với nền tảng bóng đá phong trào",
        "touch_points": [],
        "subtitle": "Ứng dụng quản lý đội bóng phong trào thông minh. Hẹn nhau ra sân!",
        "sub_y": 1680
    },
    # 2. Title Card 01 (8.0s to 9.5s)
    {
        "type": "title_card",
        "start": 8.0,
        "end": 9.5,
        "chapter": "01",
        "title": "TẠO ĐỘI BÓNG",
        "subtitle_card": "Khởi tạo câu lạc bộ & thiết lập sân nhà"
    },
    # 3. Chapter 1 Step 1 (9.5s to 13.5s)
    {
        "type": "action",
        "start": 9.5,
        "end": 13.5,
        "image": "scripts/frames_raw/c1_form_filled.png",
        "chapter_badge": "01 · TẠO ĐỘI BÓNG",
        "step_text": "Bước 1: Nhập tên đội & chọn loại sân thi đấu",
        "touch_points": [(540, 690), (500, 1820)],
        "subtitle": "Đầu tiên, khởi tạo đội bóng của bạn bằng cách nhập tên đội, chọn loại sân...",
        "sub_y": 1450
    },
    # 4. Chapter 1 Step 2 (13.5s to 17.0s)
    {
        "type": "action",
        "start": 13.5,
        "end": 17.0,
        "image": "scripts/frames_raw/c1_form_scrolled.png",
        "chapter_badge": "01 · TẠO ĐỘI BÓNG",
        "step_text": "Bước 2: Nhấn Tạo Đội Bóng để hoàn tất",
        "touch_points": [(540, 1680)],
        "subtitle": "...và nhấn Hoàn tất tạo đội để kích hoạt câu lạc bộ của bạn.",
        "sub_y": 1400
    },
    # 5. Title Card 02 (17.0s to 18.5s)
    {
        "type": "title_card",
        "start": 17.0,
        "end": 18.5,
        "chapter": "02",
        "title": "MỜI THÀNH VIÊN",
        "subtitle_card": "Gia tăng quân số & kết nối đồng đội"
    },
    # 6. Chapter 2 Step 1 (18.5s to 22.5s)
    {
        "type": "action",
        "start": 18.5,
        "end": 22.5,
        "image": "scripts/frames_raw/c2_quick_actions.png",
        "chapter_badge": "02 · MỜI THÀNH VIÊN",
        "step_text": "Bước 1: Chạm dấu (+) → Mời thành viên",
        "touch_points": [(750, 900)],
        "subtitle": "Để mời đồng đội, chạm dấu cộng trên thanh điều hướng, chọn Mời thành viên...",
        "sub_y": 1680
    },
    # 7. Chapter 2 Step 2 (22.5s to 26.5s)
    {
        "type": "action",
        "start": 22.5,
        "end": 26.5,
        "image": "scripts/frames_raw/c2_invite_modal.png",
        "chapter_badge": "02 · MỜI THÀNH VIÊN",
        "step_text": "Bước 2: Chia sẻ mã câu lạc bộ hoặc mã QR",
        "touch_points": [(540, 1150)],
        "subtitle": "...rồi chia sẻ mã câu lạc bộ hoặc mã QR tiện lợi cho cầu thủ.",
        "sub_y": 1680
    },
    # 8. Title Card 03 (26.5s to 28.0s)
    {
        "type": "title_card",
        "start": 26.5,
        "end": 28.0,
        "chapter": "03",
        "title": "TẠO LỊCH THI ĐẤU",
        "subtitle_card": "Lên lịch giao hữu & chốt hạn điểm danh"
    },
    # 9. Chapter 3 Step 1 (28.0s to 31.5s)
    {
        "type": "action",
        "start": 28.0,
        "end": 31.5,
        "image": "scripts/frames_raw/c2_quick_actions.png",
        "chapter_badge": "03 · TẠO LỊCH THI ĐẤU",
        "step_text": "Bước 1: Chạm dấu (+) → Tạo trận đấu mới",
        "touch_points": [(280, 580)],
        "subtitle": "Tạo lịch thi đấu nhanh chóng từ menu thao tác nhanh, thiết lập đối thủ và sân bóng...",
        "sub_y": 1680
    },
    # 10. Chapter 3 Step 2 (31.5s to 35.5s)
    {
        "type": "action",
        "start": 31.5,
        "end": 35.5,
        "image": "scripts/frames_raw/c3_match_sheet_filled.png",
        "chapter_badge": "03 · TẠO LỊCH THI ĐẤU",
        "step_text": "Bước 2: Thiết lập thời gian & hạn chốt điểm danh",
        "touch_points": [(540, 850), (540, 1720)],
        "subtitle": "...thời gian thi đấu và ấn định hạn chót điểm danh toàn đội.",
        "sub_y": 1480
    },
    # 11. Title Card 04 (35.5s to 37.0s)
    {
        "type": "title_card",
        "start": 35.5,
        "end": 37.0,
        "chapter": "04",
        "title": "ĐIỂM DANH",
        "subtitle_card": "Chốt quân số & báo vắng minh bạch"
    },
    # 12. Chapter 4 Step 1 (37.0s to 40.5s)
    {
        "type": "action",
        "start": 37.0,
        "end": 40.5,
        "image": "scripts/frames_raw/c4_attendance_confirmed.png",
        "chapter_badge": "04 · ĐIỂM DANH",
        "step_text": "Bước 1: Chọn Có mặt hoặc Báo vắng",
        "touch_points": [(280, 1190)],
        "subtitle": "Thành viên chủ động điểm danh Có mặt hoặc Báo vắng ngay trên thẻ trận...",
        "sub_y": 1500
    },
    # 13. Chapter 4 Step 2 (40.5s to 44.5s)
    {
        "type": "action",
        "start": 40.5,
        "end": 44.5,
        "image": "scripts/frames_raw/c4_roster_modal.png",
        "chapter_badge": "04 · ĐIỂM DANH",
        "step_text": "Bước 2: Theo dõi danh sách quân số cả đội",
        "touch_points": [(540, 480)],
        "subtitle": "...giúp ban cán sự nắm chắc quân số trước giờ bóng lăn.",
        "sub_y": 1680
    },
    # 14. Title Card 05 (44.5s to 46.0s)
    {
        "type": "title_card",
        "start": 44.5,
        "end": 46.0,
        "chapter": "05",
        "title": "QUẢN LÝ QUỸ",
        "subtitle_card": "Minh bạch thu chi & đối soát tức thì"
    },
    # 15. Chapter 5 Step 1 (46.0s to 49.5s)
    {
        "type": "action",
        "start": 46.0,
        "end": 49.5,
        "image": "scripts/frames_raw/c5_fund_overview.png",
        "chapter_badge": "05 · QUẢN LÝ QUỸ",
        "step_text": "Bước 1: Chọn Quỹ đội → Tạo đợt thu",
        "touch_points": [(815, 1680)],
        "subtitle": "Mục Quỹ đội giúp quản lý thu chi minh bạch và tạo các đợt thu quỹ định kỳ...",
        "sub_y": 1450
    },
    # 16. Chapter 5 Step 2 (49.5s to 53.5s)
    {
        "type": "action",
        "start": 49.5,
        "end": 53.5,
        "image": "scripts/frames_raw/c5_create_collection_modal.png",
        "chapter_badge": "05 · QUẢN LÝ QUỸ",
        "step_text": "Bước 2: Quét mã VietQR chuyển khoản tức thì",
        "touch_points": [(430, 1770)],
        "subtitle": "...và hỗ trợ quét mã VietQR chuyển khoản tức thì.",
        "sub_y": 1350
    },
    # 17. Outro (53.5s to 61.5s)
    {
        "type": "outro",
        "start": 53.5,
        "end": 61.5
    }
]

def render_frame_for_time(t):
    # Find active item
    active = None
    for item in TIMELINE:
        if item["start"] <= t < item["end"]:
            active = item
            break
    if not active:
        active = TIMELINE[-1]
        
    t_type = active["type"]
    
    if t_type == "intro_logo":
        return render_intro_frame(t)
    elif t_type == "title_card":
        card_key = f"{active['chapter']}_{active['title']}"
        if card_key not in ACTION_BASES:
            ACTION_BASES[card_key] = render_title_card(active["chapter"], active["title"], active["subtitle_card"])
        return ACTION_BASES[card_key]
    elif t_type == "outro":
        if "outro" not in ACTION_BASES:
            ACTION_BASES["outro"] = render_outro_frame()
        return ACTION_BASES["outro"]
    elif t_type == "action":
        base_key = f"{active['image']}_{active['step_text']}"
        if base_key not in ACTION_BASES:
            ACTION_BASES[base_key] = create_action_base(
                active["image"],
                active["chapter_badge"],
                active["step_text"],
                active["subtitle"],
                active["sub_y"]
            )
        base_img = ACTION_BASES[base_key]
        
        # If no touch points, return directly
        if not active["touch_points"]:
            return base_img
            
        # Draw dynamic pulsing rings
        pulse = (math.sin(t * 6.28 * 1.5) + 1.0) / 2.0 # 1.5 Hz pulse
        frame_copy = base_img.copy()
        d = ImageDraw.Draw(frame_copy)
        for tx, ty in active["touch_points"]:
            r1 = 48 + pulse * 14
            r2 = 30 + pulse * 7
            d.ellipse([tx - r1, ty - r1, tx + r1, ty + r1], outline=(16, 185, 129, int(130 - pulse*40)), width=4)
            d.ellipse([tx - r2, ty - r2, tx + r2, ty + r2], outline=(52, 211, 153, int(240 - pulse*30)), width=4)
            d.ellipse([tx - 12, ty - 12, tx + 12, ty + 12], fill=(255, 255, 255, 255), outline=GREEN_ACCENT, width=3)
        return frame_copy

def main():
    print(f"Starting Video Generation: {TOTAL_FRAMES} frames ({TOTAL_DURATION}s @ {FPS}fps)...", flush=True)
    
    cmd = [
        FFMPEG, "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{WIDTH}x{HEIGHT}",
        "-pix_fmt", "rgba",
        "-r", str(FPS),
        "-i", "-", # Pipe video from stdin
        "-i", AUDIO_MIX, # Input mixed audio
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        OUTPUT_MP4
    ]
    
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    
    for frame_idx in range(TOTAL_FRAMES):
        t = frame_idx / float(FPS)
        frame_img = render_frame_for_time(t)
        proc.stdin.write(frame_img.tobytes())
        
        if frame_idx % 150 == 0 or frame_idx == TOTAL_FRAMES - 1:
            pct = (frame_idx + 1) / float(TOTAL_FRAMES) * 100.0
            print(f"Progress: frame {frame_idx + 1}/{TOTAL_FRAMES} ({pct:.1f}%) [t={t:.2f}s]", flush=True)
            
    proc.stdin.close()
    stderr = proc.stderr.read().decode('utf-8', errors='ignore')
    proc.wait()
    
    if proc.returncode != 0:
        print("Error during video encoding:", stderr)
        sys.exit(1)
        
    print(f"\nSUCCESS! Video generated at: {OUTPUT_MP4}")
    
    # Inspect output file size
    size_mb = os.path.getsize(OUTPUT_MP4) / (1024 * 1024)
    print(f"File size: {size_mb:.2f} MB")

if __name__ == "__main__":
    main()
