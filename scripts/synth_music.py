import numpy as np
import wave
import struct
import math

SAMPLE_RATE = 44100

def generate_kick(duration=0.25):
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    # Pitch drop from 150 Hz to 40 Hz
    freq = 40 + (150 - 40) * np.exp(-t * 28)
    phase = 2 * np.pi * np.cumsum(freq) / SAMPLE_RATE
    env = np.exp(-t * 14)
    wave_kick = np.sin(phase) * env
    # Add subtle punch click at start
    click = np.random.uniform(-0.3, 0.3, len(t)) * np.exp(-t * 60)
    return np.clip(wave_kick + click, -1.0, 1.0)

def generate_snare(duration=0.2):
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    noise = np.random.uniform(-1.0, 1.0, len(t)) * np.exp(-t * 20)
    tone = np.sin(2 * np.pi * 180 * t) * np.exp(-t * 25)
    return np.clip(noise * 0.7 + tone * 0.4, -1.0, 1.0)

def generate_hihat(duration=0.08, open_hh=False):
    dur = duration * 2 if open_hh else duration
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur), False)
    decay = 15 if open_hh else 60
    noise = np.random.uniform(-1.0, 1.0, len(t)) * np.exp(-t * decay)
    return noise * 0.4

def generate_synth_bass(freq, duration):
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    # Sawtooth wave approximation with low-pass envelope
    saw = 2 * (t * freq - np.floor(0.5 + t * freq))
    sub = np.sin(2 * np.pi * freq * t)
    env = np.exp(-t * 3.5)
    return (saw * 0.6 + sub * 0.7) * env

def generate_synth_pluck(freq, duration):
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    pluck = (np.sin(2 * np.pi * freq * t) + 
             0.5 * np.sin(2 * np.pi * freq * 2 * t) +
             0.25 * np.sin(2 * np.pi * freq * 3 * t))
    env = np.exp(-t * 8.0)
    return pluck * env

def create_sporty_beat(total_duration_sec=65.0, bpm=124):
    beat_sec = 60.0 / bpm
    step_sec = beat_sec / 4.0 # 16th note
    total_samples = int(SAMPLE_RATE * total_duration_sec)
    left = np.zeros(total_samples, dtype=np.float32)
    right = np.zeros(total_samples, dtype=np.float32)
    
    kick = generate_kick(0.3)
    snare = generate_snare(0.22)
    hihat_closed = generate_hihat(0.06, False)
    hihat_open = generate_hihat(0.12, True)
    
    # Bass progression (A minor / F major / C major / G major athletic driving chord progression)
    # Note frequencies (Hz)
    A1, C2, D2, E2, F2, G2, A2 = 55.0, 65.41, 73.42, 82.41, 87.31, 98.00, 110.0
    bass_notes = [A1, A1, A1, C2,  F2, F2, F2, E2,  D2, D2, D2, F2,  G2, G2, E2, G2]
    
    # Arp notes (A4, C5, E5, G5, etc)
    arp_notes = [440.0, 523.25, 659.25, 783.99, 659.25, 523.25, 440.0, 523.25]
    
    total_steps = int(total_duration_sec / step_sec)
    
    for step in range(total_steps):
        t_sample = int(step * step_sec * SAMPLE_RATE)
        if t_sample >= total_samples:
            break
            
        beat_idx = (step // 4) % 4
        sub_step = step % 4
        bar_step = step % 16
        
        # 1. KICK: every beat (4-on-the-floor)
        if sub_step == 0:
            k_len = min(len(kick), total_samples - t_sample)
            left[t_sample:t_sample + k_len] += kick[:k_len] * 0.75
            right[t_sample:t_sample + k_len] += kick[:k_len] * 0.75
            
        # 2. SNARE / CLAP: beats 2 and 4 (step 4, 12 in a bar)
        if step % 8 == 4:
            s_len = min(len(snare), total_samples - t_sample)
            left[t_sample:t_sample + s_len] += snare[:s_len] * 0.55
            right[t_sample:t_sample + s_len] += snare[:s_len] * 0.55
            
        # 3. HI-HAT: 16th notes with groove accent
        hh = hihat_open if (sub_step == 2) else hihat_closed
        vol = 0.35 if (sub_step == 2) else 0.20
        hh_len = min(len(hh), total_samples - t_sample)
        left[t_sample:t_sample + hh_len] += hh[:hh_len] * (vol * 0.8)
        right[t_sample:t_sample + hh_len] += hh[:hh_len] * (vol * 1.0) # subtle stereo pan
        
        # 4. DRIVING BASS
        if sub_step in (0, 2, 3):
            b_freq = bass_notes[bar_step]
            b_dur = step_sec * 0.85
            bass_snd = generate_synth_bass(b_freq, b_dur)
            b_len = min(len(bass_snd), total_samples - t_sample)
            left[t_sample:t_sample + b_len] += bass_snd[:b_len] * 0.45
            right[t_sample:t_sample + b_len] += bass_snd[:b_len] * 0.45
            
        # 5. UPLIFTING SYNTH ARP
        a_freq = arp_notes[step % len(arp_notes)]
        a_dur = step_sec * 0.75
        arp_snd = generate_synth_pluck(a_freq, a_dur)
        a_len = min(len(arp_snd), total_samples - t_sample)
        # Stereo panning on arp
        pan = 0.5 + 0.3 * np.sin(step * 0.4)
        left[t_sample:t_sample + a_len] += arp_snd[:a_len] * (0.28 * (1 - pan))
        right[t_sample:t_sample + a_len] += arp_snd[:a_len] * (0.28 * pan)

    # Master limiter & smooth fade in/out
    fade_in_len = int(SAMPLE_RATE * 1.5)
    fade_out_len = int(SAMPLE_RATE * 2.5)
    
    in_curve = np.linspace(0, 1, fade_in_len)
    left[:fade_in_len] *= in_curve
    right[:fade_in_len] *= in_curve
    
    out_curve = np.linspace(1, 0, fade_out_len)
    left[-fade_out_len:] *= out_curve
    right[-fade_out_len:] *= out_curve
    
    # Soft limiter
    max_val = max(np.max(np.abs(left)), np.max(np.abs(right)), 1.0)
    left = np.tanh(left / max_val * 1.2) * 0.85
    right = np.tanh(right / max_val * 1.2) * 0.85
    
    # Save as 16-bit WAV
    out_wav = "scripts/audio/sporty_instrumental_beat.wav"
    with wave.open(out_wav, "w") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        
        interleaved = np.empty((total_samples * 2,), dtype=np.int16)
        interleaved[0::2] = (left * 32767).astype(np.int16)
        interleaved[1::2] = (right * 32767).astype(np.int16)
        wf.writeframes(interleaved.tobytes())
        
    print(f"Generated {out_wav} successfully ({total_duration_sec}s, {bpm} BPM)!")

if __name__ == "__main__":
    create_sporty_beat(65.0, 124)
