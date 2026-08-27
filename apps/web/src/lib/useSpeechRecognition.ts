'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { transcribeAudio } from '@/api/client';

// Declarations for browser SpeechRecognition & AudioContext
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
    AudioContext?: any;
    webkitAudioContext?: any;
  }
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isTtsSupported: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isTranscribing: boolean;
  recordingSeconds: number;
  audioLevel: number;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  clearError: () => void;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  setTranscript: (text: string) => void;
  speak: (text: string, onEnd?: () => void) => void;
  stopSpeaking: () => void;
}

// Convert Float32Array PCM to 16-bit 16kHz Mono WAV Blob
function encodeWav(samples: Float32Array, sampleRate: number = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // File length
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // Format chunk identifier
  writeString(view, 12, 'fmt ');
  // Format chunk length
  view.setUint32(16, 16, true);
  // Sample format (raw PCM)
  view.setUint16(20, 1, true);
  // Channel count (1 = mono)
  view.setUint16(22, 1, true);
  // Sample rate
  view.setUint32(24, sampleRate, true);
  // Byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // Block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // Bits per sample
  view.setUint16(34, 16, true);
  // Data chunk identifier
  writeString(view, 36, 'data');
  // Data chunk length
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Downsample Float32Array to 16kHz
function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number = 16000): Float32Array {
  if (inputRate === outputRate) return buffer;
  const sampleRateRatio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isTtsSupported, setIsTtsSupported] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [transcript, setTranscriptState] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const isListeningRef = useRef<boolean>(false);
  const timerIntervalRef = useRef<any>(null);
  const chunkStreamIntervalRef = useRef<any>(null);
  const sttActiveRef = useRef<boolean>(false);
  const onEndCallbackRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasMediaDevices = Boolean(navigator?.mediaDevices?.getUserMedia);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(Boolean(SpeechRecognition || hasMediaDevices));
      setIsTtsSupported(Boolean(window.speechSynthesis));
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscriptState('');
    setInterimTranscript('');
  }, []);

  const setTranscript = useCallback((text: string) => {
    setTranscriptState(text);
  }, []);

  // Flush and transcribe collected audio chunks to text
  const flushAndTranscribe = useCallback(async (isFinal: boolean = false) => {
    if (sttActiveRef.current) {
      // If browser STT is actively streaming text, skip backend polling
      return;
    }

    const chunks = pcmChunksRef.current;
    if (chunks.length === 0) return;

    // Concat all Float32Array chunks
    let totalLength = 0;
    for (let i = 0; i < chunks.length; i++) {
      totalLength += chunks[i].length;
    }

    // Only transcribe if we have at least ~0.8s of audio
    if (totalLength < 12000 && !isFinal) return;

    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (let i = 0; i < chunks.length; i++) {
      merged.set(chunks[i], offset);
      offset += chunks[i].length;
    }

    // Reset buffer for next slice
    pcmChunksRef.current = [];

    // Encode to 16kHz mono WAV
    const wavBlob = encodeWav(merged, 16000);

    try {
      setIsTranscribing(true);
      const res = await transcribeAudio(wavBlob);
      if (res?.text && res.text.trim()) {
        const words = res.text.trim();
        setTranscriptState((prev) => {
          if (!prev) return words;
          if (prev.endsWith(words) || prev.includes(words)) return prev;
          return `${prev} ${words}`;
        });
      }
    } catch (err) {
      console.debug('Periodic live transcription slice notice:', err);
    } finally {
      if (!isListeningRef.current) {
        setIsTranscribing(false);
      }
    }
  }, []);

  // Cleanup audio tracks and processor
  const cleanupAudioStream = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (chunkStreamIntervalRef.current) {
      clearInterval(chunkStreamIntervalRef.current);
      chunkStreamIntervalRef.current = null;
    }
    if (processorNodeRef.current) {
      try {
        processorNodeRef.current.disconnect();
      } catch {}
      processorNodeRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // Stop Listening and transcribe final slice
  const stopListening = useCallback(async () => {
    isListeningRef.current = false;
    setIsListening(false);
    setInterimTranscript('');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    // Flush any remaining audio in the buffer
    await flushAndTranscribe(true);
    cleanupAudioStream();
    setIsTranscribing(false);
  }, [cleanupAudioStream, flushAndTranscribe]);

  // Start Real-Time Live Streaming Audio Transcriber
  const startListening = useCallback(async () => {
    setError(null);
    setInterimTranscript('');
    setRecordingSeconds(0);
    pcmChunksRef.current = [];
    isListeningRef.current = true;
    sttActiveRef.current = false;

    // Stop speaking if currently speaking
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Microphone is not supported in this browser. Please type your answer directly in the box.');
      return;
    }

    try {
      // 1. Request microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      audioStreamRef.current = stream;
      setIsListening(true);

      // 2. Setup Web Audio API AudioContext for raw PCM capture & volume analyser
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const sampleRate = audioCtx.sampleRate;

        const source = audioCtx.createMediaStreamSource(stream);
        sourceNodeRef.current = source;

        // Analyser for real-time visualizer
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkVolume = () => {
          if (isListeningRef.current && audioStreamRef.current) {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((avg / 255) * 100)));
            requestAnimationFrame(checkVolume);
          }
        };
        requestAnimationFrame(checkVolume);

        // ScriptProcessor to collect 16kHz PCM frames in real-time
        const bufferSize = 4096;
        const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
        processorNodeRef.current = processor;

        processor.onaudioprocess = (e: AudioProcessingEvent) => {
          if (!isListeningRef.current) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const downsampled = downsampleBuffer(inputData, sampleRate, 16000);
          pcmChunksRef.current.push(new Float32Array(downsampled));
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);
      }

      // 3. Recording Duration Timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);

      // 4. Periodic Live Transcribe Interval (every 2.5 seconds, words stream into the textarea!)
      chunkStreamIntervalRef.current = setInterval(() => {
        if (isListeningRef.current && pcmChunksRef.current.length > 0) {
          flushAndTranscribe(false);
        }
      }, 2500);

      // 5. Try Browser SpeechRecognition for instant streaming (if supported and enabled)
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            let currentInterim = '';
            let finalChunk = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const res = event.results[i];
              if (res.isFinal) {
                finalChunk += res[0].transcript + ' ';
              } else {
                currentInterim += res[0].transcript;
              }
            }

            if (finalChunk) {
              sttActiveRef.current = true;
              setTranscriptState((prev) => (prev ? `${prev} ${finalChunk.trim()}` : finalChunk.trim()));
            }
            setInterimTranscript(currentInterim);
          };

          recognition.onerror = (event: any) => {
            const errType = event.error || '';
            if (errType === 'network') {
              // Silently switch to our live periodic Web Audio streamer (Brave mode)
              sttActiveRef.current = false;
            }
          };

          recognition.onend = () => {
            setInterimTranscript('');
          };

          recognitionRef.current = recognition;
          recognition.start();
        } catch {}
      }
    } catch (err: any) {
      console.error('Microphone initialization error:', err);
      setIsListening(false);
      isListeningRef.current = false;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission was denied. Please allow microphone access in your browser or type your answer below.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No microphone was detected on your device. Please plug in a microphone or type your answer below.');
      } else {
        setError(`Microphone notice (${err.message || err.name}). You can type your answer below.`);
      }
    }
  }, [flushAndTranscribe]);

  // Text-To-Speech
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();
    onEndCallbackRef.current = onEnd;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) =>
        (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Premium')) &&
        v.lang.startsWith('en')
    );
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      onEndCallbackRef.current?.();
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      setIsSpeaking(false);
      onEndCallbackRef.current?.();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudioStream();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [cleanupAudioStream]);

  return {
    isSupported,
    isTtsSupported,
    isListening,
    isSpeaking,
    isTranscribing,
    recordingSeconds,
    audioLevel,
    transcript,
    interimTranscript,
    error,
    clearError,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
    speak,
    stopSpeaking,
  };
}
