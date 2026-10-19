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
  initiateCall: (targetUser: UserProfile, type: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
  switchCamera: () => Promise<void>;
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
  };

  // Caller initiates call
  const initiateCall = async (targetUser: UserProfile, type: CallType) => {
    if (!profile) return;
    cleanUpMedia();
    setCallError(null);

    // Verify mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCallError('Audio and video calls require media device access, which is not supported in this browser.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video' ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false
        });
      } catch (vidErr) {
        console.warn('Video acquisition fallback to audio:', vidErr);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (audioErr: any) {
          setCallError('Microphone permission was denied or device not found. Please allow microphone access to make calls.');
          return;
        }
      }

      setLocalStream(stream);

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnection.current = pc;

      const remote = new MediaStream();
      setRemoteStream(remote);

      // Add local tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote tracks
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach(track => {
            remote.addTrack(track);
          });
        } else if (event.track) {
          remote.addTrack(event.track);
        }
      };

      // Track connection state: NEVER show successful call until actually established!
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
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callToAccept.type === 'video' ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false
        });
      } catch (vidErr) {
        console.warn('Video stream fallback to audio on accept:', vidErr);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (audioErr: any) {
          setCallError('Microphone permission was denied. Please allow microphone access.');
          return;
        }
      }

      setLocalStream(stream);

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnection.current = pc;

      const remote = new MediaStream();
      setRemoteStream(remote);

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach(track => {
            remote.addTrack(track);
          });
        } else if (event.track) {
          remote.addTrack(event.track);
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
    if (incomingCall) {
      const callRef = doc(db, 'calls', incomingCall.id);
      try {
        await updateDoc(callRef, {
          status: 'rejected',
          endedAt: serverTimestamp()
        });
      } catch {}
      setIncomingCall(null);
    }
  };

  // End active call
  const endCall = async () => {
    sound.playCallEnded();
    if (callDocRef.current) {
      try {
        await updateDoc(callDocRef.current, {
          status: 'ended',
          duration: callDuration,
          endedAt: serverTimestamp()
        });
      } catch {
        // Non-fatal
      }
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
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleAudio,
        toggleVideo,
        toggleSpeaker,
        switchCamera
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
