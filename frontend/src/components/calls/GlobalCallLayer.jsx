import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { showToast } from '../../redux/slices/uiSlice';
import { connectSocket, getSocket } from '../../services/socket';

const EMPTY_CALL = {
  status: 'idle',
  callId: null,
  callType: null,
  peerUser: null,
  peerId: null,
};
const CALL_RECONNECT_GRACE_MS = 10000;
const getIceServers = () => {
  const servers = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  const turnUrls = import.meta.env.VITE_TURN_URLS || import.meta.env.VITE_TURN_URL;

  if (turnUrls) {
    servers.push({
      urls: turnUrls.split(',').map((url) => url.trim()).filter(Boolean),
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_CREDENTIAL,
    });
  }

  return servers;
};

const GlobalCallLayer = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const token = useSelector((state) => state.auth.accessToken);
  const callRef = useRef(EMPTY_CALL);
  const peerConnectionRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const disconnectTimerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [callState, setCallState] = useState(EMPTY_CALL);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [callNotice, setCallNotice] = useState('');
  const [remoteAudioBlocked, setRemoteAudioBlocked] = useState(false);
  const isMessagesPage = location.pathname === '/messages';

  useEffect(() => {
    callRef.current = callState;
  }, [callState]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play?.().catch(() => {});
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play?.().catch(() => {});
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.volume = 1;
      remoteAudioRef.current
        .play?.()
        .then(() => setRemoteAudioBlocked(false))
        .catch(() => setRemoteAudioBlocked(Boolean(remoteStream?.getAudioTracks().length)));
    }
  }, [remoteStream]);

  const getCallMedia = async (callType) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Calls are not supported in this browser.');
    }

    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    const tracks = [...audioStream.getAudioTracks()];

    if (callType === 'video') {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
        });
        tracks.push(...videoStream.getVideoTracks());
        setCallNotice('');
      } catch (error) {
        audioStream.getTracks().forEach((track) => track.stop());
        throw new Error(error.name === 'NotAllowedError' ? 'Camera permission denied.' : 'Camera is not available.');
      }
    }

    const stream = new MediaStream(tracks);
    localStreamRef.current = stream;
    setLocalStream(stream);
    setAudioMuted(false);
    setVideoMuted(false);
    return stream;
  };

  const endCall = (notifyPeer = true) => {
    const currentCall = callRef.current;
    if (notifyPeer && currentCall.peerId && currentCall.callId) {
      getSocket()?.emit('call:end', {
        recipientId: currentCall.peerId,
        callId: currentCall.callId,
      });
    }

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    pendingIceCandidatesRef.current = [];
    if (disconnectTimerRef.current) {
      window.clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    callRef.current = EMPTY_CALL;
    setCallState(EMPTY_CALL);
    setLocalStream(null);
    setRemoteStream(null);
    setAudioMuted(false);
    setVideoMuted(false);
    setCallNotice('');
    setRemoteAudioBlocked(false);
  };

  const ensurePeerConnection = async (peerId, callId) => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    const currentCall = callRef.current;
    const stream = localStreamRef.current || (await getCallMedia(currentCall.callType || 'audio'));
    const peerConnection = new RTCPeerConnection({
      iceServers: getIceServers(),
      iceCandidatePoolSize: 10,
    });
    peerConnectionRef.current = peerConnection;

    const audioTrack = stream.getAudioTracks()[0];
    const videoTrack = stream.getVideoTracks()[0];
    const audioTransceiver = peerConnection.addTransceiver('audio', { direction: 'sendrecv' });

    if (audioTrack) {
      await audioTransceiver.sender.replaceTrack(audioTrack);
    }

    if (currentCall.callType === 'video') {
      const videoTransceiver = peerConnection.addTransceiver('video', { direction: 'sendrecv' });
      if (videoTrack) {
        await videoTransceiver.sender.replaceTrack(videoTrack);
      }
    }

    const clearDisconnectTimer = () => {
      if (disconnectTimerRef.current) {
        window.clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
    };

    const handleConnectionStateChange = () => {
      const state = peerConnection.connectionState || peerConnection.iceConnectionState;

      if (['connected', 'completed'].includes(state)) {
        clearDisconnectTimer();
        setCallState((current) =>
          current.callId === callId && current.status !== 'active' ? { ...current, status: 'active' } : current
        );
        return;
      }

      if (state === 'disconnected') {
        if (disconnectTimerRef.current) return;
        disconnectTimerRef.current = window.setTimeout(() => {
          disconnectTimerRef.current = null;
          if (peerConnectionRef.current === peerConnection && peerConnection.connectionState === 'disconnected') {
            endCall(false);
          }
        }, CALL_RECONNECT_GRACE_MS);
        return;
      }

      if (['closed', 'failed'].includes(state)) {
        clearDisconnectTimer();
        endCall(false);
      }
    };

    peerConnection.ontrack = (event) => {
      const [streamFromPeer] = event.streams;
      const nextRemoteStream = streamFromPeer || remoteStreamRef.current || new MediaStream();

      if (!streamFromPeer && !nextRemoteStream.getTracks().some((track) => track.id === event.track.id)) {
        nextRemoteStream.addTrack(event.track);
      }

      remoteStreamRef.current = nextRemoteStream;
      setRemoteStream(new MediaStream(nextRemoteStream.getTracks()));
      setCallState((current) =>
        current.callId === callId ? { ...current, status: 'active' } : current
      );
    };

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) return;
      getSocket()?.emit('call:signal', {
        recipientId: peerId,
        callId,
        signal: { type: 'candidate', candidate: event.candidate },
      });
    };

    peerConnection.onconnectionstatechange = handleConnectionStateChange;
    peerConnection.oniceconnectionstatechange = handleConnectionStateChange;

    return peerConnection;
  };

  const flushPendingIceCandidates = async (peerConnection) => {
    const pendingCandidates = pendingIceCandidatesRef.current;
    pendingIceCandidatesRef.current = [];

    await Promise.all(
      pendingCandidates.map(async (candidate) => {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (_error) {
          // Ignore stale ICE candidates so one bad candidate does not drop the call.
        }
      })
    );
  };

  const handleCallSignal = async ({ callId, signal }) => {
    const currentCall = callRef.current;
    if (currentCall.callId !== callId || !signal) return;

    try {
      const peerConnection = await ensurePeerConnection(currentCall.peerId, callId);

      if (signal.type === 'offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        await flushPendingIceCandidates(peerConnection);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        getSocket()?.emit('call:signal', {
          recipientId: currentCall.peerId,
          callId,
          signal: { type: 'answer', sdp: answer },
        });
      }

      if (signal.type === 'candidate' && signal.candidate) {
        if (!peerConnection.remoteDescription) {
          pendingIceCandidatesRef.current.push(signal.candidate);
          return;
        }

        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (_error) {
          // Ignore stale ICE candidates so the active media connection can continue.
        }
      }
    } catch (error) {
      endCall(true);
      dispatch(showToast({ tone: 'error', message: error.message || 'Call connection failed.' }));
    }
  };

  useEffect(() => {
    if (!token || isMessagesPage) return undefined;

    const socket = getSocket() || connectSocket(token);
    if (!socket) return undefined;

    const onIncomingCall = ({ callId, callType, fromUser }) => {
      if (callRef.current.status !== 'idle') {
        socket.emit('call:decline', { recipientId: fromUser._id, callId });
        return;
      }

      const nextCallState = {
        status: 'incoming',
        callId,
        callType,
        peerUser: fromUser,
        peerId: fromUser._id,
      };
      callRef.current = nextCallState;
      setCallState(nextCallState);
    };
    const onCallEnded = ({ callId }) => {
      if (callRef.current.callId !== callId) return;
      endCall(false);
      dispatch(showToast({ tone: 'default', message: 'Call ended.' }));
    };
    const onCallSignal = (payload) => handleCallSignal(payload);

    socket.on('call:incoming', onIncomingCall);
    socket.on('call:ended', onCallEnded);
    socket.on('call:signal', onCallSignal);

    return () => {
      socket.off('call:incoming', onIncomingCall);
      socket.off('call:ended', onCallEnded);
      socket.off('call:signal', onCallSignal);
    };
  }, [dispatch, isMessagesPage, token]);

  useEffect(() => {
    if (isMessagesPage && callRef.current.status !== 'idle') {
      endCall(true);
    }
  }, [isMessagesPage]);

  const acceptCall = async () => {
    const currentCall = callRef.current;
    if (currentCall.status !== 'incoming') return;

    try {
      await getCallMedia(currentCall.callType);
      await ensurePeerConnection(currentCall.peerId, currentCall.callId);
      setCallState((current) => ({ ...current, status: 'connecting' }));
      getSocket()?.emit('call:accept', {
        recipientId: currentCall.peerId,
        callId: currentCall.callId,
      });
    } catch (error) {
      declineCall();
      dispatch(showToast({ tone: 'error', message: error.message || 'Camera or microphone permission denied.' }));
    }
  };

  const declineCall = () => {
    const currentCall = callRef.current;
    if (currentCall.peerId && currentCall.callId) {
      getSocket()?.emit('call:decline', {
        recipientId: currentCall.peerId,
        callId: currentCall.callId,
      });
    }
    endCall(false);
  };

  const toggleAudio = () => {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = audioMuted;
    });
    setAudioMuted((value) => !value);
  };

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = videoMuted;
    });
    setVideoMuted((value) => !value);
  };

  const enableRemoteAudio = () => {
    if (!remoteAudioRef.current) return;
    remoteAudioRef.current.muted = false;
    remoteAudioRef.current.volume = 1;
    remoteAudioRef.current
      .play?.()
      .then(() => {
        setRemoteAudioBlocked(false);
        setCallNotice('');
      })
      .catch(() => setCallNotice('Tap again after allowing sound in your browser.'));
  };

  if (callState.status === 'idle' || isMessagesPage) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-[#121212] text-white shadow-2xl">
        <div className="relative flex min-h-[420px] items-center justify-center bg-black">
          {callState.callType === 'video' && remoteStream ? (
            <video ref={remoteVideoRef} autoPlay muted playsInline className="h-full max-h-[70vh] w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-center">
              <img
                src={callState.peerUser?.profilePicture?.url}
                alt={callState.peerUser?.username}
                className="h-28 w-28 rounded-full object-cover"
              />
              <p className="mt-4 text-xl font-semibold">{callState.peerUser?.username}</p>
              <p className="mt-2 text-sm text-white/60">
                {callState.status === 'incoming'
                  ? `${callState.callType === 'video' ? 'Video' : 'Audio'} call`
                  : callState.status === 'connecting'
                    ? 'Connecting...'
                    : 'In call'}
              </p>
            </div>
          )}

          {callState.callType === 'video' && localStream && (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="absolute bottom-5 right-5 h-32 w-24 rounded-2xl border border-white/20 bg-black object-cover shadow-lg md:h-40 md:w-32"
            />
          )}

          <audio ref={remoteAudioRef} autoPlay playsInline />
        </div>

        <div className="flex flex-col gap-4 px-5 py-5">
          <div className="text-center">
            <p className="text-sm font-semibold">{callState.peerUser?.fullName || callState.peerUser?.username}</p>
            <p className="mt-1 text-xs text-white/50">
              {callState.callType === 'video' ? 'Video call' : 'Audio call'}
            </p>
            {callNotice && <p className="mt-2 text-xs text-amber-300">{callNotice}</p>}
            {remoteAudioBlocked && (
              <button
                type="button"
                onClick={enableRemoteAudio}
                className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black"
              >
                Enable sound
              </button>
            )}
          </div>

          {callState.status === 'incoming' ? (
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={declineCall}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#ed4956] text-white"
                aria-label="Decline call"
              >
                <PhoneOff size={22} />
              </button>
              <button
                type="button"
                onClick={acceptCall}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#00a862] text-white"
                aria-label="Accept call"
              >
                <Phone size={22} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={toggleAudio}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${audioMuted ? 'bg-white text-black' : 'bg-white/15 text-white'}`}
                aria-label={audioMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {audioMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              {callState.callType === 'video' && (
                <button
                  type="button"
                  onClick={toggleVideo}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${videoMuted ? 'bg-white text-black' : 'bg-white/15 text-white'}`}
                  aria-label={videoMuted ? 'Turn camera on' : 'Turn camera off'}
                >
                  {videoMuted ? <VideoOff size={20} /> : <Video size={20} />}
                </button>
              )}
              <button
                type="button"
                onClick={() => endCall(true)}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#ed4956] text-white"
                aria-label="End call"
              >
                <PhoneOff size={22} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalCallLayer;
