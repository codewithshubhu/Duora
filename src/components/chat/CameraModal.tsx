import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle, Loader2 } from 'lucide-react';
import { compressImageToDataUrl } from '../../services/storageService';

interface CameraModalProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [compressing, setCompressing] = useState<boolean>(false);

  const handleFallbackFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const optimized = await compressImageToDataUrl(file, 1024, 0.82);
      onCapture(optimized);
      onClose();
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        onCapture(reader.result as string);
        onClose();
      };
      reader.readAsDataURL(file);
    } finally {
      setCompressing(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  const startCamera = async () => {
    stopCamera();
    setLoading(true);
    setError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported on this device/browser.');
      }

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      } catch (e) {
        // Fallback to simple video
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('In-app camera error:', err);
      setError(err?.message || 'Could not access camera. Please allow camera permissions.');
    } finally {
      setLoading(false);
    }
  };

  const flipCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const takePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front camera, flip horizontally for natural selfie
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(rawData);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmSend = async () => {
    if (!capturedImage) return;
    setCompressing(true);
    try {
      // Convert to blob and compress
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const optimized = await compressImageToDataUrl(blob, 1024, 0.82);
      onCapture(optimized);
      onClose();
    } catch (err) {
      onCapture(capturedImage);
      onClose();
    } finally {
      setCompressing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in select-none">
      <div className="relative w-full max-w-lg bg-stone-900 rounded-3xl overflow-hidden shadow-2xl border border-stone-800 flex flex-col text-white">
        
        {/* Top bar */}
        <div className="p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#7057E8]" />
            <span className="text-sm font-bold tracking-wide">Take Photo</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden native input for direct device camera capture */}
        <input
          type="file"
          ref={fallbackInputRef}
          onChange={handleFallbackFile}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        {/* Viewfinder / Preview */}
        <div className="relative aspect-4/3 w-full bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center flex flex-col items-center max-w-xs">
              <AlertCircle className="w-10 h-10 text-red-400 mb-2" />
              <span className="text-xs text-stone-300 mb-4">{error}</span>
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex-1 px-4 py-2 rounded-xl bg-white/20 text-white text-xs font-bold hover:bg-white/30 transition cursor-pointer"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={() => fallbackInputRef.current?.click()}
                  className="flex-1 px-4 py-2 rounded-xl bg-[#7057E8] text-white text-xs font-bold hover:bg-[#5B42D6] transition shadow-md cursor-pointer"
                >
                  Use Phone Camera
                </button>
              </div>
            </div>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
                  <Loader2 className="w-8 h-8 text-[#7057E8] animate-spin" />
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                onLoadedMetadata={() => setLoading(false)}
              />
            </>
          )}
        </div>

        {/* Bottom controls */}
        <div className="p-5 flex items-center justify-around bg-stone-950">
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={retakePhoto}
                className="px-5 py-2.5 rounded-2xl border border-stone-700 text-xs font-bold hover:bg-stone-800 transition cursor-pointer"
              >
                Retake
              </button>

              <button
                type="button"
                onClick={confirmSend}
                disabled={compressing}
                className="px-6 py-2.5 rounded-2xl bg-[#7057E8] hover:bg-[#5B42D6] text-white text-xs font-bold flex items-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                {compressing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Send Photo</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={flipCamera}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer"
                title="Flip Camera"
              >
                <RefreshCw className="w-5 h-5 text-stone-300" />
              </button>

              <button
                type="button"
                onClick={takePhoto}
                disabled={loading || !!error}
                className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 cursor-pointer transition active:scale-95 disabled:opacity-40"
              >
                <div className="w-full h-full bg-white rounded-full hover:bg-stone-200 transition" />
              </button>

              <div className="w-11" /> {/* Spacer to balance layout */}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
