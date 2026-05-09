import { CornerUpLeft, Pencil, Phone, Send, SmilePlus, Trash2, Video } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const REACTIONS = ['\u2764\uFE0F', '\uD83D\uDD25', '\uD83D\uDE02', '\uD83D\uDC4F', '\uD83D\uDE0D'];
const getEntityId = (value) => String(value?._id || value?.id || value || '');

const ChatWindow = ({
  conversation,
  activeUser,
  currentUser,
  onSend,
  onEditMessage,
  onReactToMessage,
  onUnsendMessage,
  onStartAudioCall,
  onStartVideoCall,
  typing,
}) => {
  const [draft, setDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [editingTargetId, setEditingTargetId] = useState(null);
  const messageListRef = useRef(null);
  const bottomRef = useRef(null);
  const scrollFrameRef = useRef(null);
  const messages = useMemo(() => conversation || [], [conversation]);
  const lastMessageId = messages[messages.length - 1]?._id;
  const lastMessageUpdatedAt = messages[messages.length - 1]?.updatedAt;

  useEffect(() => {
    setIsTyping(typing);
  }, [typing]);

  const scrollToBottom = (behavior = 'smooth') => {
    const messageList = messageListRef.current;
    if (!messageList) return;

    if (scrollFrameRef.current) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      messageList.scrollTop = messageList.scrollHeight;
      bottomRef.current?.scrollIntoView({ block: 'end', behavior });
      scrollFrameRef.current = null;
    });
  };

  useLayoutEffect(() => {
    scrollToBottom('auto');
  }, [activeUser?._id, messages.length, lastMessageId, lastMessageUpdatedAt]);

  useEffect(() => {
    if (typing) {
      scrollToBottom('smooth');
    }
  }, [typing]);

  useEffect(
    () => () => {
      if (scrollFrameRef.current) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    },
    []
  );

  const submit = (event) => {
    event.preventDefault();
    if (!draft.trim()) return;

    if (editingTargetId) {
      onEditMessage(editingTargetId, draft);
      setEditingTargetId(null);
    } else {
      onSend(draft, replyTarget?._id);
    }

    setDraft('');
    setReplyTarget(null);
  };

  const handleReactionPress = (event, messageId, emoji) => {
    event.preventDefault();
    event.stopPropagation();
    onReactToMessage(messageId, emoji);
  };

  if (!activeUser) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
        Select a chat to start messaging.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[#dbdbdb] px-6 py-4 dark:border-[#262626]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={activeUser.profilePicture?.url}
              alt={activeUser.username}
              className="h-8 w-8 rounded-full object-cover"
            />
            <div>
              <p className="text-sm font-semibold">{activeUser.username}</p>
              <p className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8]">
                {isTyping ? (
                  <span className="flex items-center gap-1">
                    typing
                    <span className="flex gap-0.5">
                      <span className="animate-bounce">.</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                    </span>
                  </span>
                ) : (
                  activeUser.fullName
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[#8e8e8e]">
            <button
              type="button"
              onClick={onStartAudioCall}
              className="rounded-full p-2 hover:bg-[#f5f5f5] dark:hover:bg-[#121212]"
              aria-label="Start audio call"
              title="Start audio call"
            >
              <Phone size={18} />
            </button>
            <button
              type="button"
              onClick={onStartVideoCall}
              className="rounded-full p-2 hover:bg-[#f5f5f5] dark:hover:bg-[#121212]"
              aria-label="Start video call"
              title="Start video call"
            >
              <Video size={18} />
            </button>
          </div>
        </div>
      </div>

      <div ref={messageListRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-6">
        {messages.map((message) => {
          const mine = getEntityId(message.sender) === getEntityId(currentUser);
          const currentReaction = message.reactions?.find(
            (reaction) => getEntityId(reaction.user) === getEntityId(currentUser)
          )?.emoji;
          const replySenderName =
            message.replyTo?.sender?.username ||
            (getEntityId(message.replyTo?.sender) === getEntityId(currentUser) ? 'you' : activeUser.username);

          return (
            <div
              key={message._id}
              className={`group flex w-full items-end gap-2 ${mine ? 'justify-end pl-12' : 'justify-start pr-12'}`}
            >
              {!mine && (
                <img
                  src={activeUser.profilePicture?.url}
                  alt={activeUser.username}
                  className="mb-1 h-7 w-7 shrink-0 rounded-full object-cover"
                />
              )}

              <div className={`flex max-w-[75%] items-end gap-2 ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`${mine ? 'items-end' : 'items-start'} flex max-w-full flex-col`}>
                  {message.replyTo && (
                    <div className="mb-1 max-w-full rounded-2xl border border-[#dbdbdb] bg-[#fafafa] px-3 py-2 text-xs text-[#8e8e8e] dark:border-[#262626] dark:bg-[#121212]">
                      Replying to {replySenderName}: {message.replyTo.text || 'shared message'}
                    </div>
                  )}

                  <div
                    className={`max-w-full break-words rounded-[22px] px-4 py-2.5 text-sm ${
                      mine
                        ? 'bg-[#0095f6] text-white'
                        : 'border border-[#dbdbdb] bg-white text-[#262626] dark:border-[#262626] dark:bg-black dark:text-white'
                    }`}
                  >
                    {message.sharedPost && (
                      <Link
                        to={`/post/${getEntityId(message.sharedPost)}`}
                        className="mb-3 block overflow-hidden rounded-2xl border border-white/20 bg-black/10 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#0095f6]"
                        title="Open shared post"
                      >
                        <img
                          src={message.sharedPost.media?.[0]?.url}
                          alt={message.sharedPost.caption}
                          className="h-32 w-full object-cover"
                          onLoad={() => scrollToBottom('auto')}
                        />
                        <div className="px-3 py-2 text-xs">
                          <p className="font-semibold">@{message.sharedPost.author?.username}</p>
                          <p className="mt-1 line-clamp-2">{message.sharedPost.caption || 'Shared post'}</p>
                        </div>
                      </Link>
                    )}

                    {message.isUnsent ? (
                      <span className={`italic ${mine ? 'text-white/80' : 'text-[#8e8e8e] dark:text-[#a8a8a8]'}`}>
                        {mine ? 'You unsent a message' : 'This message was unsent'}
                      </span>
                    ) : (
                      <span>{message.text || (message.media?.length ? 'Shared media' : 'Shared a post')}</span>
                    )}

                    {message.editedAt && <p className="mt-1 text-[10px] opacity-70">Edited</p>}
                  </div>

                  {!message.isUnsent && (
                    <div className={`mt-1 flex flex-wrap items-center gap-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                      {message.reactions?.map((reaction) => (
                        <span
                          key={`${message._id}_${getEntityId(reaction.user)}_${reaction.emoji}`}
                          className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-xs shadow-sm dark:bg-[#121212]"
                        >
                          {reaction.emoji}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {!message.isUnsent && (
                  <div className="flex items-center gap-1 rounded-full border border-[#dbdbdb] bg-white px-2 py-1 text-[#8e8e8e] opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-within:opacity-100 dark:border-[#262626] dark:bg-black">
                    <button
                      type="button"
                      onClick={() => setReplyTarget(message)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-[#f5f5f5] hover:text-[#262626] dark:hover:bg-[#121212] dark:hover:text-white"
                      aria-label="Reply"
                      title="Reply"
                    >
                      <CornerUpLeft size={14} />
                    </button>
                    {REACTIONS.map((emoji) => (
                      <button
                        key={`${message._id}_${emoji}`}
                        type="button"
                        onPointerDown={(event) => handleReactionPress(event, message._id, emoji)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            handleReactionPress(event, message._id, emoji);
                          }
                        }}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-base transition hover:bg-[#f5f5f5] dark:hover:bg-[#121212] ${
                          currentReaction === emoji ? 'bg-[#f5f5f5] ring-1 ring-[#dbdbdb] dark:bg-[#121212] dark:ring-[#262626]' : ''
                        }`}
                        aria-label={`React ${emoji}`}
                        title={`React ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                    {mine && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTargetId(message._id);
                          setDraft(message.text || '');
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-[#f5f5f5] hover:text-[#262626] dark:hover:bg-[#121212] dark:hover:text-white"
                        aria-label="Edit"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    {mine && (
                      <button
                        type="button"
                        onClick={() => onUnsendMessage(message._id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-[#f5f5f5] hover:text-[#ed4956] dark:hover:bg-[#121212]"
                        aria-label="Unsend"
                        title="Unsend"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex justify-start">
            <div className="rounded-[22px] border border-[#dbdbdb] bg-white px-4 py-2.5 dark:border-[#262626] dark:bg-black">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#8e8e8e]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#8e8e8e]" style={{ animationDelay: '0.1s' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#8e8e8e]" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="shrink-0 border-t border-[#dbdbdb] bg-white p-4 dark:border-[#262626] dark:bg-black">
        {(replyTarget || editingTargetId) && (
          <div className="mb-3 rounded-2xl border border-[#dbdbdb] bg-[#fafafa] px-4 py-3 text-sm dark:border-[#262626] dark:bg-[#121212]">
            {editingTargetId
              ? 'Editing message'
              : `Replying to ${
                  replyTarget?.sender?.username ||
                  (getEntityId(replyTarget?.sender) === getEntityId(currentUser) ? 'you' : activeUser.username)
                }`}
          </div>
        )}
        <div className="flex items-center gap-3 rounded-full border border-[#dbdbdb] px-4 py-2 dark:border-[#262626]">
          <SmilePlus size={18} className="text-[#8e8e8e]" />
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Message..."
            className="w-full bg-transparent text-sm outline-none"
          />
          <button type="submit" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0095f6]">
            <Send size={16} />
            {editingTargetId ? 'Save' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
