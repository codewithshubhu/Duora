import React, { useState, useRef, useEffect } from 'react';
import { Square, Trash2, Send, Play, Pause } from 'lucide-react';

interface VoiceRecorderProps {
  onSend: (audioDataUrl: string, duration: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');

  // Detect supported audio mime types across Chrome, Safari, Android & iOS
  const getSupportedMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/ogg;codecs=opus'
    ];
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  useEffect(() => {
    startRecording();
    return () => {
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  const stopTracks = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;

      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      // Continuous 250ms chunks ensure recorder buffer is flushed regularly
      recorder.start(250);
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access notice:', err);
      onCancel();
    }
  };

  const stopAndGetBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        if (audioBlob) {
          resolve(audioBlob);
        } else if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current || 'audio/webm' });
          setAudioBlob(blob);
          resolve(blob);
        } else {
          resolve(null);
        }
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const mime = mimeTypeRef.current || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        setAudioBlob(blob);
        resolve(blob);
      };

      mediaRecorderRef.current.stop();
      stopTracks();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });
  };

  const handleStopClick = async () => {
    await stopAndGetBlob();
  };

  const handleSend = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      let blob = audioBlob;
      if (!blob || isRecording) {
        blob = await stopAndGetBlob();
      }

      if (!blob || blob.size === 0) {
        onCancel();
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        onSend(base64data, Math.max(1, duration));
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Error processing audio note:', err);
      onCancel();
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePreviewPlay = () => {
    if (!audioBlob) return;
    if (!audioPlayerRef.current) {
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audio.onended = () => setIsPlayingPreview(false);
      audioPlayerRef.current = audio;
    }

    if (isPlayingPreview) {
      audioPlayerRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPlayerRef.current.play().catch(() => {});
      setIsPlayingPreview(true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-3 w-full bg-violet-50 dark:bg-violet-950/40 p-2.5 rounded-2xl border border-violet-200 dark:border-violet-900/50 animate-in fade-in select-none">
      <div className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
        <span className="font-mono text-xs font-bold text-violet-900 dark:text-violet-200">
          {formatTime(duration)}
        </span>
      </div>

      {/* Waveform Visualizer */}
      <div className="flex-1 flex items-center justify-center gap-1 h-6">
        {[40, 70, 30, 90, 60, 100, 50, 80, 45, 95, 65, 35, 75, 55].map((height, i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-150 ${
              isRecording ? 'bg-[#7057E8]' : 'bg-stone-300 dark:bg-stone-600'
            }`}
            style={{
              height: isRecording ? `${Math.max(20, (height * Math.random() + 20))}%` : '25%'
            }}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isRecording ? (
          <button
            type="button"
            onClick={handleStopClick}
            className="p-2 rounded-xl bg-violet-200 dark:bg-violet-900/60 text-violet-800 dark:text-violet-200 hover:bg-violet-300 transition cursor-pointer"
            title="Stop recording"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={togglePreviewPlay}
            className="p-2 rounded-xl bg-violet-200 dark:bg-violet-900/60 text-violet-800 dark:text-violet-200 hover:bg-violet-300 transition cursor-pointer"
            title="Listen preview"
          >
            {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        )}

        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 transition cursor-pointer"
          title="Delete voice note"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleSend}
          disabled={isProcessing}
          className="p-2 rounded-xl bg-[#7057E8] text-white hover:bg-[#5B42D6] transition shadow-md flex items-center gap-1 text-xs font-semibold cursor-pointer"
          title="Send voice note"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
