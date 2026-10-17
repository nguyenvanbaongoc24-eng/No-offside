import numpy as np
import wave
import subprocess
import os

SAMPLE_RATE = 44100
FFMPEG = r"C:\Users\LENOVO\AppData\Roaming\Python\Python314\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"

TIMINGS = [
    # (key, start_time_sec)
    ("00_intro", 0.5),
    ("01_tao_doi", 9.5),
    ("02_moi_thanh_vien", 18.5),
    ("03_tao_lich", 28.0),
    ("04_diem_danh", 37.0),
    ("05_quan_ly_quy", 46.0),
    ("06_outro", 54.0),
]

TOTAL_DURATION = 61.5

def read_audio_to_numpy(path):
    # Convert any audio (mp3/wav) to 44.1kHz 16-bit mono wav in memory via ffmpeg
    cmd = [
        FFMPEG, "-y", "-i", path,
        "-ar", str(SAMPLE_RATE),
        "-ac", "1",
        "-f", "s16le",
        "-"
    ]
    proc = subprocess.run(cmd, capture_output=True)
    raw = proc.stdout
    data = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    return data

def mix_audio():
    total_samples = int(SAMPLE_RATE * TOTAL_DURATION)
    speech_track = np.zeros(total_samples, dtype=np.float32)
    ducking_mask = np.ones(total_samples, dtype=np.float32) # 1.0 = loud, 0.22 = ducked
    
    # 1. Place each speech segment
    for key, start_sec in TIMINGS:
        path = os.path.join("scripts/audio", f"{key}.mp3")
        speech_data = read_audio_to_numpy(path)
        start_samp = int(start_sec * SAMPLE_RATE)
        end_samp = min(start_samp + len(speech_data), total_samples)
        seg_len = end_samp - start_samp
        
        speech_track[start_samp:end_samp] += speech_data[:seg_len]
        
        # Apply ducking to mask: duck from start_sec - 0.2s to end_sec + 0.3s
        duck_start = max(0, start_samp - int(0.25 * SAMPLE_RATE))
        duck_end = min(total_samples, end_samp + int(0.35 * SAMPLE_RATE))
        
        # Smooth ramp in
        ramp_len = int(0.25 * SAMPLE_RATE)
        ramp_in = np.linspace(1.0, 0.20, ramp_len)
        ramp_out = np.linspace(0.20, 1.0, ramp_len)
        
        ducking_mask[duck_start:duck_start + ramp_len] = np.minimum(ducking_mask[duck_start:duck_start + ramp_len], ramp_in)
        ducking_mask[duck_start + ramp_len:duck_end - ramp_len] = np.minimum(ducking_mask[duck_start + ramp_len:duck_end - ramp_len], 0.20)
        ducking_mask[duck_end - ramp_len:duck_end] = np.minimum(ducking_mask[duck_end - ramp_len:duck_end], ramp_out)

    # 2. Read background music (sporty beat)
    # Regenerate sporty beat with exact duration
    from synth_music import create_sporty_beat
    create_sporty_beat(TOTAL_DURATION + 1.0, 124)
    
    music_left = np.zeros(total_samples, dtype=np.float32)
    music_right = np.zeros(total_samples, dtype=np.float32)
    
    with wave.open("scripts/audio/sporty_instrumental_beat.wav", "r") as wf:
        n_ch = wf.getnchannels()
        raw_music = wf.readframes(total_samples)
        music_samples = np.frombuffer(raw_music, dtype=np.int16).astype(np.float32) / 32768.0
        if n_ch == 2:
            music_left = music_samples[0::2][:total_samples]
            music_right = music_samples[1::2][:total_samples]
        else:
            music_left = music_samples[:total_samples]
            music_right = music_samples[:total_samples]

    # Apply ducking to music
    music_left = music_left * ducking_mask * 0.70
    music_right = music_right * ducking_mask * 0.70
    
    # 3. Combine speech and music
    final_left = music_left + speech_track * 1.15
    final_right = music_right + speech_track * 1.15
    
    # Final fade out at the very end (last 1.5s)
    fade_len = int(1.5 * SAMPLE_RATE)
    final_left[-fade_len:] *= np.linspace(1.0, 0.0, fade_len)
    final_right[-fade_len:] *= np.linspace(1.0, 0.0, fade_len)
    
    # Soft limiter / clip guard
    max_amp = max(np.max(np.abs(final_left)), np.max(np.abs(final_right)), 1.0)
    if max_amp > 0.95:
        final_left = (final_left / max_amp) * 0.95
        final_right = (final_right / max_amp) * 0.95
        
    out_mix = "scripts/audio/final_audio_mix.wav"
    with wave.open(out_mix, "w") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        
        interleaved = np.empty((total_samples * 2,), dtype=np.int16)
        interleaved[0::2] = (final_left * 32767).astype(np.int16)
        interleaved[1::2] = (final_right * 32767).astype(np.int16)
        wf.writeframes(interleaved.tobytes())
        
    print(f"Mixed final audio: {out_mix} ({TOTAL_DURATION}s) successfully!")

if __name__ == "__main__":
    mix_audio()
