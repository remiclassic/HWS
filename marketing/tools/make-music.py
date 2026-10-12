"""Original soundtrack for the Spotter promo. 150 BPM so every cut (3.2, 7.0, 10.6, 14.0,
18.6, 21.2 s) lands on an eighth note. Usage: python make-music.py out.wav"""
import sys, wave
import numpy as np

SR, DUR, BEAT = 44100, 24.0, 0.4
N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)
CUTS = [3.2, 7.0, 10.6, 14.0, 18.6, 21.2]

def add(buf, t, sig, gain=1.0):
    i = int(t * SR)
    if i >= N or i < 0: return
    sig = sig[: N - i]
    buf[i : i + len(sig)] += sig * gain

def both(t, sig, gain=1.0, pan=0.0):
    add(L, t, sig, gain * (1 - max(0, pan))); add(R, t, sig, gain * (1 + min(0, pan)))

def tt(d): return np.arange(int(d * SR)) / SR
def lp(x, n): return np.convolve(x, np.ones(n) / n, mode="same")
def hp(x, n): return x - lp(x, n)

def kick():
    t = tt(0.32); f = 45 + 110 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) + 0.25 * hp(rng.standard_normal(len(t)), 8) * np.exp(-t * 200)

def snare():
    t = tt(0.22)
    return 0.7 * hp(rng.standard_normal(len(t)), 12) * np.exp(-t * 22) + 0.5 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)

def hat(d=0.05):
    t = tt(d); return hp(rng.standard_normal(len(t)), 4) * np.exp(-t * (3.2 / d))

def saw(f, d, harm=10):
    t = tt(d); return sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, harm + 1) if f * k < 9000)

def bass(f, d=0.19):
    t = tt(d); return (saw(f, d, 6) + 0.8 * np.sin(2 * np.pi * f * t)) * np.minimum(1, t * 400) * np.exp(-t * 7)

def pluck(f, d=0.18):
    t = tt(d); sq = sum(np.sin(2 * np.pi * f * k * t) / k for k in (1, 3, 5, 7) if f * k < 9000)
    return sq * np.minimum(1, t * 800) * np.exp(-t * 16)

def stab(freqs, d=1.2):
    t = tt(d); return sum(saw(f, d, 8) for f in freqs) / len(freqs) * np.minimum(1, t * 300) * np.exp(-t * 3.2)

def riser(d=0.4):
    t = tt(d); return hp(rng.standard_normal(len(t)), 6) * (t / d) ** 2.5

def impact():
    t = tt(0.9); return lp(rng.standard_normal(len(t)), 30) * np.exp(-t * 5) * 2.5 + np.sin(2 * np.pi * 48 * t) * np.exp(-t * 6)

# Am - F - C - G, one bar each (root Hz for bass, chord tones for arps/stabs)
A, F, C, G = (55.0, [220.0, 261.63, 329.63]), (43.65, [174.61, 220.0, 261.63]), (65.41, [261.63, 329.63, 392.0]), (49.0, [196.0, 246.94, 293.66])
PROG = [A, F, C, G]
duck = np.ones(N)

for b in range(60):                      # 60 beats = 24 s
    t = b * BEAT; bar, pos = divmod(b, 4); root, tones = PROG[bar % 4]
    intro, outro = t < 3.2, t >= 21.2
    race = 14.0 <= t < 18.6
    if outro: continue
    # drums
    if not intro or pos in (0,) or b >= 6:
        if not intro or pos == 0:
            both(t, kick(), 0.95)
            i = int(t * SR); e = min(N, i + int(0.22 * SR)); duck[i:e] *= np.linspace(0.35, 1, e - i)
    if not intro and pos in (1, 3): both(t, snare(), 0.5)
    if intro and b >= 6:                 # snare roll into the first cut
        for k in range(4): both(t + k * 0.1, snare(), 0.18 + 0.05 * (b - 6) * 4 / 4 + 0.04 * k)
    if not intro or b >= 2:
        for k in range(2): both(t + k * 0.2, hat(), (0.16 if k == 0 else 0.26) * (0.6 if intro else 1), pan=0.3)
        if race:
            for k in range(4): both(t + k * 0.1 + 0.05, hat(0.03), 0.1, pan=-0.4)
    # bass: eighths, octave jump on the off-eighth in the race section
    if True:
        for k in range(2 if not intro else 1):
            f = root * (2 if (race and k == 1) else 1)
            add(L, t + k * 0.2, bass(f), 0.42); add(R, t + k * 0.2, bass(f), 0.42)
    # lead arp: sixteenths from the second scene, an octave up while racing
    if t >= 7.0:
        seq = [0, 1, 2, 1] if not race else [0, 2, 1, 2]
        for k in range(4):
            f = tones[seq[k]] * (2 if not race else 4) * (1 if (b + k) % 8 else 2 ** (0 if race else 0))
            both(t + k * 0.1, pluck(f), 0.14 if not race else 0.12, pan=0.5 if k % 2 else -0.5)
    elif pos % 2 == 0:
        both(t, pluck(tones[0] * 2, 0.3), 0.16); both(t + 0.2, pluck(tones[2] * 2, 0.3), 0.12)

for c in CUTS:                           # riser into, impact + chord stab on, every cut
    both(c - 0.4, riser(), 0.22)
    both(c, impact(), 0.3)
    bar = int(round(c / BEAT)) // 4
    both(c, stab(PROG[bar % 4][1]), 0.2)

# Intro: low drone that opens up into the first cut
t = tt(3.2)
drone = saw(55.0, 3.2, 14) * (0.25 + 0.75 * (t / 3.2) ** 2) + 0.5 * np.sin(2 * np.pi * 110 * t) * (t / 3.2)
both(0, lp(drone, 24) * np.minimum(1, t * 20), 0.3)

# Outro: held A-minor chord, last kick, tail
t = tt(2.8)
chord = sum(saw(f, 2.8, 10) for f in (110.0, 220.0, 261.63, 329.63, 440.0)) / 5 * np.exp(-t * 0.7)
both(21.2, chord, 0.6); both(21.2, kick(), 1.0)
for k, f in enumerate([440.0, 523.25, 659.25, 880.0]): both(21.2 + 0.2 * k, pluck(f, 0.6), 0.2, pan=0.4 if k % 2 else -0.4)

# Sidechain everything except the kick transient region is close enough at this level
L *= 0.6 + 0.4 * duck; R *= 0.6 + 0.4 * duck
mix = np.stack([L, R], axis=1)
fade = np.ones(N); n = int(0.9 * SR); fade[-n:] = np.linspace(1, 0, n) ** 2; fade[: int(0.01 * SR)] = np.linspace(0, 1, int(0.01 * SR))
mix *= fade[:, None]
mix = np.tanh(mix * 1.6) / np.tanh(1.6)  # soft clip
mix *= 0.89 / np.max(np.abs(mix))
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("wrote", sys.argv[1])
