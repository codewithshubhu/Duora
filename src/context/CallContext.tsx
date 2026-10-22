import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  addDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { CallRecord, CallStatus, CallType, UserProfile } from '../types';
import { sound } from '../utils/sound';
import { cleanFirestoreObject } from '../firebase/clean';
import { logCallInConversation } from '../services/chatService';

interface CallContextType {
  activeCall: CallRecord | null;
  incomingCall: CallRecord | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isSpeakerOn: boolean;
  isCallEstablished: boolean;
  facingMode: 'user' | 'environment';
  callDuration: number;
  callHistory: CallRecord[];
  callError: string | null;
  clearCallError: () => void;
  isVirtualMedia: boolean;
  initiateCall: (targetUser: UserProfile, type: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
  switchCamera: () => Promise<void>;
  retryMicrophoneAccess: () => Promise<boolean>;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [activeCall, setActiveCall] = useState<CallRecord | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallRecord | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isCallEstablished, setIsCallEstablished] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [callDuration, setCallDuration] = useState(0);
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [callError, setCallError] = useState<string | null>(null);
  const [isVirtualMedia, setIsVirtualMedia] = useState(false);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const callDocRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const callTimeoutRef = useRef<number | null>(null);
  const unsubscribeCallRef = useRef<(() => void) | null>(null);
  const unsubscribeCandidatesRef = useRef<(() => void) | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);

  const clearCallError = () => setCallError(null);

  // Subscribe to incoming calls for current user
  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', profile.uid),
      where('status', '==', 'ringing')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setIncomingCall(null);
        sound.stopIncomingRingtone();
        return;
      }

      snap.forEach((d) => {
        const call = { ...d.data(), id: d.id } as CallRecord;
        if (!activeCall) {
          setIncomingCall(call);
          sound.startIncomingRingtone();
        }
      });
    }, (err) => {
      console.warn('Incoming call listener notice:', err);
    });

    return () => {
      unsubscribe();
      sound.stopIncomingRingtone();
    };
  }, [profile, activeCall]);

  // Subscribe to call history
  useEffect(() => {
    if (!profile) return;
    const q1 = query(
      collection(db, 'calls'),
      where('callerId', '==', profile.uid),
      orderBy('createdAt', 'desc'),
      limit(25)
    );
    const q2 = query(
      collection(db, 'calls'),
      where('receiverId', '==', profile.uid),
      orderBy('createdAt', 'desc'),
      limit(25)
    );

    const unsub1 = onSnapshot(q1, (snap1) => {
      const callerCalls: CallRecord[] = [];
      snap1.forEach(d => callerCalls.push({ ...d.data(), id: d.id } as CallRecord));
      setCallHistory(prev => mergeCallHistory(callerCalls, prev));
    }, () => {});

    const unsub2 = onSnapshot(q2, (snap2) => {
      const receiverCalls: CallRecord[] = [];
      snap2.forEach(d => receiverCalls.push({ ...d.data(), id: d.id } as CallRecord));
      setCallHistory(prev => mergeCallHistory(receiverCalls, prev));
    }, () => {});

    return () => {
      unsub1();
      unsub2();
    };
  }, [profile]);

  function mergeCallHistory(newCalls: CallRecord[], oldCalls: CallRecord[]): CallRecord[] {
    const map = new Map<string, CallRecord>();
    [...newCalls, ...oldCalls].forEach(c => map.set(c.id, c));
    return Array.from(map.values()).sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
  }

  // Active call duration timer: ONLY runs when connection is truly established!
  useEffect(() => {
    if (activeCall && isCallEstablished) {
      timerRef.current = window.setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setCallDuration(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeCall, isCallEstablished]);

  // Complete cleanup helper
  const cleanUpMedia = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (unsubscribeCallRef.current) {
      unsubscribeCallRef.current();
      unsubscribeCallRef.current = null;
    }
    if (unsubscribeCandidatesRef.current) {
      unsubscribeCandidatesRef.current();
      unsubscribeCandidatesRef.current = null;
    }
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    pendingCandidatesRef.current = [];
    sound.stopIncomingRingtone();
    setActiveCall(null);
    setIncomingCall(null);
    setIsAudioMuted(false);
    setIsVideoMuted(false);
    setIsCallEstablished(false);
    setIsVirtualMedia(false);
  };

  // Resilient multi-tier media acquisition helper (Android, desktop & iframe safe)
  const acquireCallMediaStream = async (
    type: CallType,
    mode: 'user' | 'environment'
  ): Promise<{ stream: MediaStream; isVirtual: boolean; errorNotice?: string }> => {
    const isIframe = typeof window !== 'undefined' && window.self !== window.top;

    // Direct hardware acquisition
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: { ideal: true },
            noiseSuppression: { ideal: true },
            autoGainControl: { ideal: true }
          },
          video: type === 'video' ? {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } : false
        });
        return { stream, isVirtual: false };
      } catch (errCombined) {
        console.warn('Unified getUserMedia failed, trying standard fallback:', errCombined);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: type === 'video' ? true : false
          });
          return { stream, isVirtual: false };
        } catch (errRelaxed) {
          console.warn('Relaxed getUserMedia failed:', errRelaxed);
          if (type === 'video') {
            try {
              const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
              return {
                stream: audioOnly,
                isVirtual: false,
                errorNotice: 'Camera unavailable. Voice audio connected.'
              };
            } catch (errAudio) {
              console.warn('Audio fallback failed:', errAudio);
            }
          }
        }
      }
    }

    // Tier 3: Resilient synthetic stream fallback (ensures signaling connects even if embedded iframe sandbox denies hardware)
    const syntheticStream = new MediaStream();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const dest = ctx.createMediaStreamDestination();
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        dest.stream.getAudioTracks().forEach(t => syntheticStream.addTrack(t));
      }
    } catch (aErr) {
      console.warn('Virtual audio generation note:', aErr);
    }

    if (type === 'video') {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#171523';
          ctx.fillRect(0, 0, 640, 480);
          ctx.fillStyle = '#7057E8';
          ctx.font = 'bold 24px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Duora Video Call', 320, 240);
        }
        const canvasStream = canvas.captureStream(10);
        canvasStream.getVideoTracks().forEach(t => syntheticStream.addTrack(t));
      } catch (vErr) {
        console.warn('Virtual video generation note:', vErr);
      }
    }

    const notice = isIframe
      ? 'Microphone hardware restricted by embedded preview frame. Tap "Retry Mic" or open fullscreen.'
      : 'Microphone permission was not detected. Tap "Retry Mic" to request permission.';

    return { stream: syntheticStream, isVirtual: true, errorNotice: notice };
  };

  // Re-request and hot-swap microphone track on active call
  const retryMicrophoneAccess = async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return false;
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      const newAudioTrack = s.getAudioTracks()[0];
      if (!newAudioTrack) return false;

      // Replace audio track on WebRTC peer connection
      if (peerConnection.current) {
        const senders = peerConnection.current.getSenders();
        const audioSender = senders.find(sender => sender.track?.kind === 'audio');
        if (audioSender) {
          await audioSender.replaceTrack(newAudioTrack);
        } else {
          peerConnection.current.addTrack(newAudioTrack, s);
        }
      }

      // Update localStream
      if (localStream) {
        localStream.getAudioTracks().forEach(t => t.stop());
        const updated = new MediaStream();
        updated.addTrack(newAudioTrack);
        localStream.getVideoTracks().forEach(t => updated.addTrack(t));
        setLocalStream(updated);
      } else {
        setLocalStream(s);
      }

      setIsVirtualMedia(false);
      setCallError(null);
      return true;
    } catch (err: any) {
      console.warn('Retry microphone access failed:', err);
      setCallError('Microphone access: ' + (err?.message || 'Permission denied. Please allow microphone in browser settings.'));
      return false;
    }
  };

  // Caller initiates call
  const initiateCall = async (targetUser: UserProfile, type: CallType) => {
    if (!profile) return;
    cleanUpMedia();
    setCallError(null);

    // Prevent calling if either user is blocked
    if (profile.blockedUserIds?.includes(targetUser.uid) || targetUser.blockedUserIds?.includes(profile.uid)) {
      setCallError('Cannot call this user due to block settings.');
      return;
    }

    try {
      const mediaResult = await acquireCallMediaStream(type, facingMode);
      setIsVirtualMedia(mediaResult.isVirtual);
      if (mediaResult.errorNotice) {
        setCallError(mediaResult.errorNotice);
      }
      const stream = mediaResult.stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnection.current = pc;

      const remote = new MediaStream();
      setRemoteStream(remote);

      // Add local tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote tracks and re-create MediaStream to trigger React element bindings
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach(track => {
            if (!remote.getTracks().some(t => t.id === track.id)) {
              remote.addTrack(track);
            }
          });
          setRemoteStream(new MediaStream(remote.getTracks()));
        } else if (event.track) {
          if (!remote.getTracks().some(t => t.id === event.track.id)) {
            remote.addTrack(event.track);
          }
          setRemoteStream(new MediaStream(remote.getTracks()));
        }
      };

      // Track connection state
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setIsCallEstablished(true);
          sound.playCallConnected();
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          sound.playCallEnded();
          cleanUpMedia();
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setIsCallEstablished(true);
        }
      };

      const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const callRef = doc(db, 'calls', callId);
      callDocRef.current = callRef;

      // ICE candidates
      const callerCandidatesCol = collection(db, 'calls', callId, 'callerCandidates');
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const cand = event.candidate;
          addDoc(callerCandidatesCol, cleanFirestoreObject({
            candidate: cand.candidate,
            sdpMid: cand.sdpMid || '',
            sdpMLineIndex: cand.sdpMLineIndex ?? 0
          })).catch(() => {});
        }
      };

      // Create Offer SDP
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === 'video',
      });
      await pc.setLocalDescription(offer);

      const callData: CallRecord = {
        id: callId,
        callerId: profile.uid,
        callerName: profile.displayName,
        callerAvatar: profile.avatarUrl,
        callerDuoraId: profile.duoraId,
        receiverId: targetUser.uid,
        receiverName: targetUser.displayName,
        receiverAvatar: targetUser.avatarUrl,
        receiverDuoraId: targetUser.duoraId,
        type,
        status: 'ringing',
        duration: 0,
        offer: {
          type: offer.type,
          sdp: offer.sdp || ''
        },
        createdAt: serverTimestamp(),
      };

      await setDoc(callRef, cleanFirestoreObject(callData));
      setActiveCall(callData);

      // Ringing timeout (45 seconds)
      callTimeoutRef.current = window.setTimeout(async () => {
        if (activeCall?.status === 'ringing') {
          try {
            await updateDoc(callRef, { status: 'missed', endedAt: serverTimestamp() });
          } catch {}
          sound.playCallEnded();
          cleanUpMedia();
        }
      }, 45000);

      // Listen for Call answer / rejection / end
      unsubscribeCallRef.current = onSnapshot(callRef, async (snap) => {
        const data = snap.data() as CallRecord;
        if (!data) return;

        if (data.status === 'accepted' && data.answer && (!pc.remoteDescription || pc.signalingState === 'have-local-offer')) {
          try {
            const answerDesc = new RTCSessionDescription(data.answer as RTCSessionDescriptionInit);
            await pc.setRemoteDescription(answerDesc);

            // Flush queued candidates
            for (const cand of pendingCandidatesRef.current) {
              await pc.addIceCandidate(cand).catch(() => {});
            }
            pendingCandidatesRef.current = [];

            setActiveCall(prev => prev ? { ...prev, status: 'accepted' } : null);

            // Listen for receiver candidates
            const receiverCandidatesCol = collection(db, 'calls', callId, 'receiverCandidates');
            unsubscribeCandidatesRef.current = onSnapshot(receiverCandidatesCol, (candSnap) => {
              candSnap.docChanges().forEach((change) => {
                if (change.type === 'added') {
                  const cData = change.doc.data();
                  if (cData?.candidate) {
                    const candidate = new RTCIceCandidate(cData);
                    if (pc.remoteDescription && pc.remoteDescription.type) {
                      pc.addIceCandidate(candidate).catch(() => {});
                    } else {
                      pendingCandidatesRef.current.push(candidate);
                    }
                  }
                }
              });
            });
          } catch (descErr) {
            console.warn('Set remote description error:', descErr);
          }
        } else if (data.status === 'rejected' || data.status === 'ended') {
          sound.playCallEnded();
          cleanUpMedia();
        }
      });

    } catch (err: any) {
      console.error('Call initiation error:', err);
      setCallError('Could not start call: ' + (err?.message || 'Media access failed.'));
      cleanUpMedia();
    }
  };

  // Receiver accepts call
  const acceptCall = async () => {
    if (!incomingCall || !profile) return;
    sound.stopIncomingRingtone();
    const callToAccept = incomingCall;
    setIncomingCall(null);
    setCallError(null);

    try {
      const mediaResult = await acquireCallMediaStream(callToAccept.type, facingMode);
      setIsVirtualMedia(mediaResult.isVirtual);
      if (mediaResult.errorNotice) {
        setCallError(mediaResult.errorNotice);
      }
      const stream = mediaResult.stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnection.current = pc;

      const remote = new MediaStream();
      setRemoteStream(remote);

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote tracks and re-create MediaStream to trigger React element bindings
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach(track => {
            if (!remote.getTracks().some(t => t.id === track.id)) {
              remote.addTrack(track);
            }
          });
          setRemoteStream(new MediaStream(remote.getTracks()));
        } else if (event.track) {
          if (!remote.getTracks().some(t => t.id === event.track.id)) {
            remote.addTrack(event.track);
          }
          setRemoteStream(new MediaStream(remote.getTracks()));
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setIsCallEstablished(true);
          sound.playCallConnected();
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          sound.playCallEnded();
          cleanUpMedia();
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setIsCallEstablished(true);
        }
      };

      const callRef = doc(db, 'calls', callToAccept.id);
      callDocRef.current = callRef;

      // ICE candidates
      const receiverCandidatesCol = collection(db, 'calls', callToAccept.id, 'receiverCandidates');
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const cand = event.candidate;
          addDoc(receiverCandidatesCol, cleanFirestoreObject({
            candidate: cand.candidate,
            sdpMid: cand.sdpMid || '',
            sdpMLineIndex: cand.sdpMLineIndex ?? 0
          })).catch(() => {});
        }
      };

      // Set Remote Offer
      if (callToAccept.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(callToAccept.offer as RTCSessionDescriptionInit));
        
        // Flush pending
        for (const cand of pendingCandidatesRef.current) {
          await pc.addIceCandidate(cand).catch(() => {});
        }
        pendingCandidatesRef.current = [];
      }

      // Create Answer SDP
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await updateDoc(callRef, cleanFirestoreObject({
        status: 'accepted',
        answer: {
          type: answer.type,
          sdp: answer.sdp || ''
        }
      }));

      setActiveCall({ ...callToAccept, status: 'accepted' });

      // Listen for caller candidates
      const callerCandidatesCol = collection(db, 'calls', callToAccept.id, 'callerCandidates');
      unsubscribeCandidatesRef.current = onSnapshot(callerCandidatesCol, (candSnap) => {
        candSnap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const cData = change.doc.data();
            if (cData?.candidate) {
              const candidate = new RTCIceCandidate(cData);
              if (pc.remoteDescription && pc.remoteDescription.type) {
                pc.addIceCandidate(candidate).catch(() => {});
              } else {
                pendingCandidatesRef.current.push(candidate);
              }
            }
          }
        });
      });

      // Listen for caller ending
      unsubscribeCallRef.current = onSnapshot(callRef, (snap) => {
        const data = snap.data() as CallRecord;
        if (data && data.status === 'ended') {
          sound.playCallEnded();
          cleanUpMedia();
        }
      });

    } catch (err: any) {
      console.error('Call acceptance error:', err);
      setCallError('Could not accept call: ' + (err?.message || 'Media stream error.'));
      cleanUpMedia();
    }
  };

  // Receiver rejects call
  const rejectCall = async () => {
    sound.stopIncomingRingtone();
    if (incomingCall && profile) {
      const callRef = doc(db, 'calls', incomingCall.id);
      try {
        await updateDoc(callRef, {
          status: 'rejected',
          endedAt: serverTimestamp()
        });
      } catch {}

      const callerUser: UserProfile = {
        uid: incomingCall.callerId,
        displayName: incomingCall.callerName,
        avatarUrl: incomingCall.callerAvatar,
        duoraId: incomingCall.callerDuoraId,
        username: incomingCall.callerName.toLowerCase().replace(/\s+/g, '_'),
        usernameLower: incomingCall.callerName.toLowerCase().replace(/\s+/g, '_'),
        isDiscoverable: true,
        showOnlineStatus: true,
        showLastSeen: true,
        readReceipts: true,
      };

      logCallInConversation(callerUser, profile, incomingCall.type, 'rejected', 0).catch(() => {});
      setIncomingCall(null);
    }
  };

  // End active call
  const endCall = async () => {
    sound.playCallEnded();
    if (callDocRef.current && activeCall && profile) {
      try {
        await updateDoc(callDocRef.current, {
          status: 'ended',
          duration: callDuration,
          endedAt: serverTimestamp()
        });
      } catch {
        // Non-fatal
      }

      const isCaller = activeCall.callerId === profile.uid;
      const otherUser: UserProfile = {
        uid: isCaller ? activeCall.receiverId : activeCall.callerId,
        displayName: isCaller ? activeCall.receiverName : activeCall.callerName,
        avatarUrl: isCaller ? activeCall.receiverAvatar : activeCall.callerAvatar,
        duoraId: isCaller ? activeCall.receiverDuoraId : activeCall.callerDuoraId,
        username: (isCaller ? activeCall.receiverName : activeCall.callerName).toLowerCase().replace(/\s+/g, '_'),
        usernameLower: (isCaller ? activeCall.receiverName : activeCall.callerName).toLowerCase().replace(/\s+/g, '_'),
        isDiscoverable: true,
        showOnlineStatus: true,
        showLastSeen: true,
        readReceipts: true,
      };

      const callerProfile = isCaller ? profile : otherUser;
      const receiverProfile = isCaller ? otherUser : profile;
      logCallInConversation(callerProfile, receiverProfile, activeCall.type, 'ended', callDuration).catch(() => {});
    }
    cleanUpMedia();
  };

  // Toggle Mute Audio
  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        setIsAudioMuted(!track.enabled);
      });
    }
  };

  // Toggle Video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
        setIsVideoMuted(!track.enabled);
      });
    }
  };

  // Toggle Speaker (audio output / earpiece)
  const toggleSpeaker = () => {
    setIsSpeakerOn(prev => !prev);
  };

  // Switch camera front/back
  const switchCamera = async () => {
    if (!localStream || !peerConnection.current) return;
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: !isAudioMuted
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const sender = peerConnection.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }
      localStream.getVideoTracks().forEach(t => t.stop());
      setLocalStream(newStream);
      setFacingMode(newMode);
    } catch (err) {
      console.warn('Switch camera notice:', err);
    }
  };

  return (
    <CallContext.Provider
      value={{
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
        callHistory,
        callError,
        clearCallError,
        isVirtualMedia,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleAudio,
        toggleVideo,
        toggleSpeaker,
        switchCamera,
        retryMicrophoneAccess
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
