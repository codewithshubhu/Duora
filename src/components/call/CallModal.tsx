import React, { useEffect, useRef, useState } from 'react';
import { useCall } from '../../context/CallContext';
import { useAuth } from '../../context/AuthContext';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Phone,
  RefreshCw,
  Volume2,
  VolumeX,
  Shield,
  Sparkles,
  AlertCircle,
  ExternalLink,
  X
} from 'lucide-react';

export const CallModal: React.FC = () => {
  const { profile } = useAuth();
  const {
    activeCall,
    incomingCall,
    localStream,
    remoteStream,
    isAudioMuted,
    isVideoMuted,
    isSpeakerOn,
    isCallEstablished,
    facingMode,
    callDuration,
    callError,
    clearCallError,
    isVirtualMedia,
    acceptCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
    toggleSpeaker,
    switchCamera,
    retryMicrophoneAccess
  } = useCall();

  const [isRetryingMic, setIsRetryingMic] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoMuted]);

  // Attach remote stream to video AND audio elements
  useEffect(() => {
    if (!remoteStream) return;
    const attachStreams = () => {
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(() => {});
      }
      if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(() => {});
      }
    };

    attachStreams();
    remoteStream.onaddtrack = attachStreams;
    remoteStream.onremovetrack = attachStreams;
    return () => {
      remoteStream.onaddtrack = null;
      remoteStream.onremovetrack = null;
    };
  }, [remoteStream]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Error & Safe Mode Banner
  const renderErrorBanner = () => {
    if (!callError) return null;
    return (
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-in fade-in slide-in-from-top-4">
        <div className="p-4 rounded-2xl bg-stone-900/95 text-white shadow-2xl flex items-start justify-between gap-3 border border-[#7057E8]/50 backdrop-blur-md">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#7057E8]" />
            <div className="text-xs">
              <span className="font-bold block text-sm mb-0.5">Call Audio Notice</span>
              <p className="text-stone-300 leading-relaxed mb-2">{callError}</p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={async () => {
                    setIsRetryingMic(true);
                    await retryMicrophoneAccess();
                    setIsRetryingMic(false);
                  }}
                  disabled={isRetryingMic}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7057E8] text-white font-bold text-[11px] hover:bg-[#5B42D6] transition cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{isRetryingMic ? 'Requesting...' : 'Grant / Retry Mic'}</span>
                </button>
                {isVirtualMedia && typeof window !== 'undefined' && window.self !== window.top && (
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white font-semibold text-[11px] hover:bg-white/20 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Fullscreen</span>
                  </a>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={clearCallError}
            className="p-1 rounded-full hover:bg-white/20 text-stone-400 hover:text-white shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // 1. Incoming Call Dialog Alert
  if (incomingCall && !activeCall) {
    return (
      <>
        {renderErrorBanner()}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
          <div className="w-full max-w-sm bg-white dark:bg-[#1A1826] rounded-3xl shadow-2xl border border-violet-200 dark:border-violet-900/60 p-6 text-center flex flex-col items-center">
            
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#7057E8] shadow-lg">
                <img
                  src={incomingCall.callerAvatar}
                  alt={incomingCall.callerName}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 p-2 rounded-full bg-[#7057E8] text-white shadow">
                {incomingCall.type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
              </span>
            </div>

            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              {incomingCall.callerName}
            </h3>
            <span className="font-mono text-xs text-[#7057E8] dark:text-[#A796FF] font-medium">
              {incomingCall.callerDuoraId}
            </span>
            <span className="text-xs text-stone-500 mt-1 block">
              Incoming {incomingCall.type === 'video' ? 'video' : 'voice'} call...
            </span>

            <div className="flex items-center gap-8 mt-8 w-full justify-center">
              {/* Decline button */}
              <button
                type="button"
                onClick={rejectCall}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition text-white flex items-center justify-center shadow-lg shadow-red-500/30">
                  <PhoneOff className="w-7 h-7" />
                </div>
                <span className="text-xs text-stone-500 font-semibold group-hover:text-red-500">Decline</span>
              </button>

              {/* Accept button */}
              <button
                type="button"
                onClick={acceptCall}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-pulse">
                  <Phone className="w-7 h-7" />
                </div>
                <span className="text-xs text-stone-500 font-semibold group-hover:text-emerald-500">Accept</span>
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // 2. Active Call Fullscreen Overlay
  if (!activeCall) return renderErrorBanner();

  const isVideo = activeCall.type === 'video';
  const isCaller = activeCall.callerId === profile?.uid;
  const otherName = isCaller ? activeCall.receiverName : activeCall.callerName;
  const otherAvatar = isCaller ? activeCall.receiverAvatar : activeCall.callerAvatar;
  const otherDuoraId = isCaller ? activeCall.receiverDuoraId : activeCall.callerDuoraId;

  return (
    <>
      {renderErrorBanner()}
      
      {/* Hidden dedicated audio element for 100% reliable remote voice playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="fixed inset-0 z-50 bg-[#0F0E17] flex flex-col items-center justify-between p-4 sm:p-6 select-none animate-in fade-in">
        
        {/* Top Status Bar */}
        <div className="w-full flex items-center justify-between text-white/90 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wide uppercase text-white/80">
              {activeCall.type === 'video' ? 'Video Call' : 'Voice Call'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isCallEstablished ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'}`} />
            <span className="font-mono text-sm font-bold tracking-wider">
              {isCallEstablished
                ? formatDuration(callDuration)
                : activeCall.status === 'ringing'
                  ? (isCaller ? 'Ringing...' : 'Incoming...')
                  : 'Connecting...'}
            </span>
          </div>
        </div>

        {/* Main Center Video or Audio Visualizer */}
        <div className="relative flex-1 w-full max-w-4xl flex items-center justify-center my-3 sm:my-4 overflow-hidden rounded-3xl bg-black/40 border border-white/10">
          
          {isVideo ? (
            <>
              {/* Remote Fullscreen Video */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover rounded-3xl"
              />

              {/* Local Picture-in-Picture Video */}
              <div className="absolute top-4 right-4 w-28 sm:w-44 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl bg-black z-20">
                {isVideoMuted ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-stone-900 text-stone-400 text-xs">
                    <VideoOff className="w-6 h-6 mb-1" />
                    <span>Camera Off</span>
                  </div>
                ) : (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                  />
                )}
              </div>
            </>
          ) : (
            /* Audio-only Visualizer */
            <div className="flex flex-col items-center justify-center text-center p-6 sm:p-8">
              <div className="relative mb-6">
                <div className="absolute -inset-4 rounded-full bg-[#7057E8]/30 blur-2xl animate-pulse" />
                <img
                  src={otherAvatar}
                  alt={otherName}
                  className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-[#7057E8] shadow-2xl"
                />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {otherName}
              </h2>
              <div className="flex items-center gap-1.5 mt-4 text-xs text-stone-300">
                <Volume2 className="w-4 h-4 text-[#7057E8]" />
                <span>{isCallEstablished ? 'Connected' : 'Connecting...'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Controls Floating Dock - Large comfortable touch targets */}
        <div className="flex items-center justify-center gap-3 sm:gap-5 bg-white/10 backdrop-blur-xl px-5 sm:px-8 py-3 rounded-full border border-white/15 z-20 shadow-2xl">
          {/* Toggle Audio (Mute) */}
          <button
            type="button"
            onClick={toggleAudio}
            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full transition active:scale-95 flex items-center justify-center cursor-pointer ${
              isAudioMuted ? 'bg-red-500 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
            title={isAudioMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isAudioMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Speaker / Earpiece Output Toggle */}
          <button
            type="button"
            onClick={toggleSpeaker}
            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full transition active:scale-95 flex items-center justify-center cursor-pointer ${
              isSpeakerOn ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-stone-700 text-stone-300'
            }`}
            title={isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
          >
            {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>

          {/* Video Toggle Controls */}
          {isVideo && (
            <>
              <button
                type="button"
                onClick={toggleVideo}
                className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full transition active:scale-95 flex items-center justify-center cursor-pointer ${
                  isVideoMuted ? 'bg-red-500 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
                title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isVideoMuted ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>

              {/* Flip Camera */}
              <button
                type="button"
                onClick={switchCamera}
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white/20 hover:bg-white/30 text-white transition active:scale-95 flex items-center justify-center cursor-pointer"
                title="Flip Camera"
              >
                <RefreshCw className="w-6 h-6" />
              </button>
            </>
          )}

          {/* End Call Button */}
          <button
            type="button"
            onClick={endCall}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white transition shadow-lg shadow-red-600/40 flex items-center justify-center cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </>
  );
};
