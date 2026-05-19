import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import api from '../services/api';
import ChatWindow from '../components/messages/ChatWindow';
import ConversationList from '../components/messages/ConversationList';
import {
  editMessage,
  fetchConversation,
  fetchConversations,
  reactToMessage,
  resetMessagesState,
  sendMessage,
  setActiveUser,
  setTypingState,
  unsendMessage,
} from '../redux/slices/messagesSlice';
import { showToast } from '../redux/slices/uiSlice';
import { connectSocket, getSocket } from '../services/socket';

const EMPTY_CALL = { status: 'idle', callId: null, callType: null, peerUser: null, peerId: null, isCaller: false };
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
const getEntityId = (value) => String(value?._id || value?.id || value || '');
const waitForSocketConnection = (socket) =>
  new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      socket.off('connect', handleConnect);
      reject(new Error('Unable to connect call right now.'));
    }, 5000);

    const handleConnect = () => {
      window.clearTimeout(timeoutId);
      resolve();
    };

    socket.once('connect', handleConnect);
    socket.connect();
  });

const MessagesPage = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { accessToken, user: authUser } = useSelector((state) => state.auth);
  const { conversations, activeUserId, messagesByUser, typingByUser } = useSelector(
    (state) => state.messages
  );
  const previousUserIdRef = useRef(null);
  const callRef = useRef(EMPTY_CALL);
  const peerConnectionRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [callState, setCallState] = useState(EMPTY_CALL);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);

  useEffect(() => {
    callRef.current = callState;
  }, [callState]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play?.().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!authUser?._id) {
      previousUserIdRef.current = null;
      setFollowingUsers([]);
      dispatch(resetMessagesState());
      return;
    }

    if (previousUserIdRef.current !== authUser._id) {
      dispatch(resetMessagesState());
      previousUserIdRef.current = authUser._id;
    }
  }, [authUser?._id, dispatch]);

  useEffect(() => {
    if (!authUser?._id) return;
    dispatch(fetchConversations(search));
  }, [authUser?._id, dispatch, search]);

  useEffect(() => {
    const rawFollowing = authUser?.following || [];
    const populatedFollowing = rawFollowing.filter((entry) => entry && typeof entry === 'object' && entry.username);

    if (rawFollowing.length === 0) {
      setFollowingUsers([]);
      return;
    }

    if (populatedFollowing.length === rawFollowing.length) {
      setFollowingUsers(populatedFollowing);
      return;
    }

    let cancelled = false;

    const fetchFollowingUsers = async () => {
      try {
        const responses = await Promise.all(
          rawFollowing.map(async (entry) => {
            if (entry && typeof entry === 'object' && entry.username) {
              return entry;
            }

            const userId = String(entry?._id || entry);
            const { data } = await api.get(`/users/${userId}`);
            return data?.user || data;
          })
        );

        if (!cancelled) {
          setFollowingUsers(responses.filter(Boolean));
        }
      } catch {
        if (!cancelled) {
          setFollowingUsers(populatedFollowing);
        }
      }
    };

    fetchFollowingUsers();

    return () => {
      cancelled = true;
    };
  }, [authUser?.following]);

  useEffect(() => {
    const firstConversationUserId = getEntityId(conversations[0]?.user);
    if (!activeUserId && firstConversationUserId) {
      dispatch(setActiveUser(firstConversationUserId));
      dispatch(fetchConversation(firstConversationUserId));
    }
  }, [activeUserId, conversations, dispatch]);

  useEffect(() => {
    const userId = searchParams.get('user');
    if (userId) {
      dispatch(setActiveUser(userId));
      dispatch(fetchConversation(userId));
    }
  }, [dispatch, searchParams]);

  useEffect(() => {
    const socket = getSocket() || connectSocket(accessToken);
    if (!socket) return;

    const onTyping = ({ fromUserId }) => dispatch(setTypingState({ userId: fromUserId, value: true }));
    const onStopTyping = ({ fromUserId }) =>
      dispatch(setTypingState({ userId: fromUserId, value: false }));
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
        isCaller: false,
      };
      callRef.current = nextCallState;
      setCallState(nextCallState);
    };
    const onCallAccepted = async ({ callId }) => {
      const currentCall = callRef.current;
      if (currentCall.callId !== callId || !currentCall.isCaller) return;

      try {
        const peerConnection = await ensurePeerConnection(currentCall.peerId, callId);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('call:signal', {
          recipientId: currentCall.peerId,
          callId,
          signal: { type: 'offer', sdp: offer },
        });
        setCallState((current) => ({ ...current, status: 'connecting' }));
      } catch (error) {
        endCall(false);
        dispatch(showToast({ tone: 'error', message: error.message || 'Unable to start call.' }));
      }
    };
    const onCallDeclined = ({ callId }) => {
      if (callRef.current.callId !== callId) return;
      endCall(false);
      dispatch(showToast({ tone: 'default', message: 'Call declined.' }));
    };
    const onCallUnavailable = ({ callId }) => {
      if (callRef.current.callId !== callId) return;
      endCall(false);
      dispatch(showToast({ tone: 'error', message: 'User is not available for calls right now.' }));
    };
    const onCallEnded = ({ callId }) => {
      if (callRef.current.callId !== callId) return;
      endCall(false);
      dispatch(showToast({ tone: 'default', message: 'Call ended.' }));
    };
    const onCallSignal = (payload) => handleCallSignal(payload);

    socket.on('chat:typing', onTyping);
    socket.on('chat:stop-typing', onStopTyping);
    socket.on('call:incoming', onIncomingCall);
    socket.on('call:accepted', onCallAccepted);
    socket.on('call:declined', onCallDeclined);
    socket.on('call:unavailable', onCallUnavailable);
    socket.on('call:ended', onCallEnded);
    socket.on('call:signal', onCallSignal);

    return () => {
      socket.off('chat:typing', onTyping);
      socket.off('chat:stop-typing', onStopTyping);
      socket.off('call:incoming', onIncomingCall);
      socket.off('call:accepted', onCallAccepted);
      socket.off('call:declined', onCallDeclined);
      socket.off('call:unavailable', onCallUnavailable);
      socket.off('call:ended', onCallEnded);
      socket.off('call:signal', onCallSignal);
    };
  }, [accessToken, dispatch]);

  const activeConversation = conversations.find((item) => getEntityId(item.user) === getEntityId(activeUserId));
  const [activeUserInfo, setActiveUserInfo] = useState(null);

  const activeUser = activeConversation?.user || activeUserInfo;
  const activeMessages = messagesByUser[activeUserId] || [];

  useEffect(() => {
    if (!activeUserId) {
      setActiveUserInfo(null);
      return;
    }

    if (getEntityId(activeConversation?.user) === getEntityId(activeUserId)) {
      setActiveUserInfo(null);
      return;
    }

    const fetchUserInfo = async () => {
      try {
        const { data } = await api.get(`/users/${activeUserId}`);
        setActiveUserInfo(data?.user || data);
      } catch {
        setActiveUserInfo(null);
      }
    };

    fetchUserInfo();
  }, [activeUserId, activeConversation]);

  const handleSelect = (userId) => {
    dispatch(setActiveUser(userId));
    dispatch(fetchConversation(userId));
  };

  const handleSendWithReply = (text, replyToId) => {
    if (!activeUserId) return;
    dispatch(sendMessage({ recipientId: activeUserId, text, replyToId }));
  };

  const handleEditMessage = (messageId, text) => {
    if (!activeUserId) return;
    dispatch(editMessage({ messageId, text, userId: activeUserId }));
  };

  const handleReactToMessage = async (messageId, emoji) => {
    if (!activeUserId) return;
    const result = await dispatch(reactToMessage({ messageId, emoji, userId: activeUserId }));
    if (result.error) {
      dispatch(showToast({ tone: 'error', message: result.payload || 'Unable to react to this message.' }));
      return;
    }

    dispatch(fetchConversation(activeUserId));
  };

  const handleUnsendMessage = (messageId) => {
    if (!activeUserId) return;
    dispatch(unsendMessage({ messageId, userId: activeUserId }));
  };

  const getCallMedia = async (callType) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Calls are not supported in this browser.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video',
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    setAudioMuted(false);
    setVideoMuted(false);
    return stream;
  };

  const ensurePeerConnection = async (peerId, callId) => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    const currentCall = callRef.current;
    const stream = localStreamRef.current || (await getCallMedia(currentCall.callType || 'audio'));
    const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnectionRef.current = peerConnection;

    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

    peerConnection.ontrack = (event) => {
      const [streamFromPeer] = event.streams;
      const nextRemoteStream = streamFromPeer || remoteStreamRef.current || new MediaStream();

      if (!streamFromPeer && !nextRemoteStream.getTracks().some((track) => track.id === event.track.id)) {
        nextRemoteStream.addTrack(event.track);
      }

      remoteStreamRef.current = nextRemoteStream;
      setRemoteStream(nextRemoteStream);
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

    peerConnection.onconnectionstatechange = () => {
      if (['closed', 'disconnected', 'failed'].includes(peerConnection.connectionState)) {
        endCall(false);
      }
    };

    return peerConnection;
  };

  const flushPendingIceCandidates = async (peerConnection) => {
    const pendingCandidates = pendingIceCandidatesRef.current;
    pendingIceCandidatesRef.current = [];

    await Promise.all(
      pendingCandidates.map((candidate) => peerConnection.addIceCandidate(new RTCIceCandidate(candidate)))
    );
  };

  const startCall = async (callType) => {
    if (!activeUser?._id || callRef.current.status !== 'idle') return;

    const socket = getSocket() || connectSocket(accessToken);
    if (!socket) {
      dispatch(showToast({ tone: 'error', message: 'Unable to connect call right now.' }));
      return;
    }

    const callId = `${authUser?._id}_${activeUser._id}_${Date.now()}`;
    try {
      await waitForSocketConnection(socket);
      await getCallMedia(callType);
      const nextCallState = {
        status: 'outgoing',
        callId,
        callType,
        peerUser: activeUser,
        peerId: activeUser._id,
        isCaller: true,
      };
      callRef.current = nextCallState;
      setCallState(nextCallState);
      socket.emit('call:invite', { recipientId: activeUser._id, callId, callType });
    } catch (error) {
      dispatch(showToast({ tone: 'error', message: error.message || 'Camera or microphone permission denied.' }));
    }
  };

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
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setAudioMuted(false);
    setVideoMuted(false);
    callRef.current = EMPTY_CALL;
    setCallState(EMPTY_CALL);
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

      if (signal.type === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        await flushPendingIceCandidates(peerConnection);
        setCallState((current) => ({ ...current, status: 'active' }));
      }

      if (signal.type === 'candidate' && signal.candidate) {
        if (!peerConnection.remoteDescription) {
          pendingIceCandidatesRef.current.push(signal.candidate);
          return;
        }

        await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (error) {
      endCall(true);
      dispatch(showToast({ tone: 'error', message: error.message || 'Call connection failed.' }));
    }
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

  return (
    <div className="mx-auto max-w-[935px] px-4 py-8">
      <div className="ig-surface h-[calc(100vh-96px)] min-h-0 overflow-hidden rounded-lg">
        <div className="grid h-full min-h-0 grid-cols-[350px_minmax(0,1fr)]">
          <ConversationList
            conversations={conversations}
            activeUserId={activeUserId}
            onSelect={handleSelect}
            followingUsers={followingUsers}
            search={search}
            onSearchChange={setSearch}
          />
          <ChatWindow
            conversation={activeMessages}
            activeUser={activeUser}
            currentUser={authUser}
            onSend={handleSendWithReply}
            onEditMessage={handleEditMessage}
            onReactToMessage={handleReactToMessage}
            onUnsendMessage={handleUnsendMessage}
            onStartAudioCall={() => startCall('audio')}
            onStartVideoCall={() => startCall('video')}
            typing={typingByUser[activeUserId]}
          />
        </div>
      </div>

      {callState.status !== 'idle' && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-[#121212] text-white shadow-2xl">
            <div className="relative flex min-h-[420px] items-center justify-center bg-black">
              {callState.callType === 'video' && remoteStream ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="h-full max-h-[70vh] w-full object-cover" />
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
                      : callState.status === 'outgoing'
                        ? 'Ringing...'
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

              <audio ref={remoteAudioRef} autoPlay />
            </div>

            <div className="flex flex-col gap-4 px-5 py-5">
              <div className="text-center">
                <p className="text-sm font-semibold">{callState.peerUser?.fullName || callState.peerUser?.username}</p>
                <p className="mt-1 text-xs text-white/50">
                  {callState.callType === 'video' ? 'Video call' : 'Audio call'}
                </p>
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
      )}
    </div>
  );
};

export default MessagesPage;
