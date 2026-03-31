import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import api from '../services/api';
import ChatWindow from '../components/messages/ChatWindow';
import ConversationList from '../components/messages/ConversationList';
import {
  appendIncomingMessage,
  fetchConversation,
  fetchConversations,
  sendMessage,
  setActiveUser,
  setTypingState,
} from '../redux/slices/messagesSlice';
import { connectSocket, getSocket } from '../services/socket';

const MessagesPage = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { accessToken } = useSelector((state) => state.auth);
  const { conversations, activeUserId, messagesByUser, typingByUser } = useSelector(
    (state) => state.messages
  );

  useEffect(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

  useEffect(() => {
    if (!activeUserId && conversations[0]?.user?._id) {
      dispatch(setActiveUser(conversations[0].user._id));
      dispatch(fetchConversation(conversations[0].user._id));
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

    const onMessage = (message) => dispatch(appendIncomingMessage(message));
    const onTyping = ({ fromUserId }) => dispatch(setTypingState({ userId: fromUserId, value: true }));
    const onStopTyping = ({ fromUserId }) =>
      dispatch(setTypingState({ userId: fromUserId, value: false }));

    socket.on('message:new', onMessage);
    socket.on('chat:typing', onTyping);
    socket.on('chat:stop-typing', onStopTyping);

    return () => {
      socket.off('message:new', onMessage);
      socket.off('chat:typing', onTyping);
      socket.off('chat:stop-typing', onStopTyping);
    };
  }, [accessToken, dispatch]);

  const activeConversation = conversations.find((item) => item.user?._id === activeUserId);
  const [activeUserInfo, setActiveUserInfo] = useState(null);

  const activeUser = activeConversation?.user || activeUserInfo;
  const activeMessages = messagesByUser[activeUserId] || [];

  useEffect(() => {
    if (!activeUserId) {
      setActiveUserInfo(null);
      return;
    }

    if (activeConversation?.user?._id === activeUserId) {
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

  const handleSend = (text) => {
    if (!activeUserId) return;
    dispatch(sendMessage({ recipientId: activeUserId, text }));
  };

  return (
    <div className="mx-auto max-w-[935px] px-4 py-8">
      <div className="ig-surface h-[calc(100vh-96px)] overflow-hidden rounded-lg">
        <div className="grid h-full grid-cols-[350px_1fr]">
          <ConversationList
            conversations={conversations}
            activeUserId={activeUserId}
            onSelect={handleSelect}
          />
          <ChatWindow
            conversation={activeMessages}
            activeUser={activeUser}
            onSend={handleSend}
            typing={typingByUser[activeUserId]}
          />
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
