// Rejestrator głosu nagrywający WAV (16-bit PCM, mono, 16 kHz) przez Web Audio
// API — zamiast MediaRecorder, który w Chrome/Edge produkuje tylko `webm/opus`,
// a tego kontenera dekoder xAI STT nie rozpoznaje (zwraca pustą transkrypcję).
// WAV jest jawnie wspierany. Plik jest tylko po stronie klienta ("use client").

const TARGET_RATE = 16000; // wystarcza dla mowy, mały payload

export class VoiceRecorder {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private chunks: Float32Array[] = [];
  private inputRate = 48000;

  /** Prosi o mikrofon i zaczyna zbierać próbki. Rzuca, gdy brak dostępu. */
  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new Ctor();
    this.inputRate = this.ctx.sampleRate;
    this.source = this.ctx.createMediaStreamSource(this.stream);

    // ScriptProcessor jest „deprecated", ale działa wszędzie i nie wymaga
    // osobnego pliku worklet. 4096 ramek to ~85 ms przy 48 kHz.
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1);
    this.chunks = [];
    this.processor.onaudioprocess = (e) => {
      // Kopiujemy — bufor wejściowy jest reużywany przez przeglądarkę.
      this.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };

    // Wycisz odsłuch (gain 0), żeby nie było sprzężenia z głośników.
    const mute = this.ctx.createGain();
    mute.gain.value = 0;
    this.source.connect(this.processor);
    this.processor.connect(mute);
    mute.connect(this.ctx.destination);
  }

  /** Kończy nagrywanie i zwraca gotowy plik WAV. */
  async stop(): Promise<Blob> {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.ctx) await this.ctx.close().catch(() => {});

    const merged = mergeChunks(this.chunks);
    const down = downsample(merged, this.inputRate, TARGET_RATE);
    this.chunks = [];
    return encodeWav(down, TARGET_RATE);
  }
}

function mergeChunks(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function downsample(input: Float32Array, from: number, to: number): Float32Array {
  if (to >= from) return input;
  const ratio = from / to;
  const length = Math.floor(input.length / ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    // Uśrednij okno próbek — prosty, wystarczający antyaliasing.
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // rozmiar bloku fmt
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate (16-bit mono)
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bity na próbkę
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}
