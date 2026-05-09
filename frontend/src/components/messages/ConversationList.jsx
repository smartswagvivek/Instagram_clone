import { Pin, PlusSquare, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

const getEntityId = (value) => String(value?._id || value?.id || value || '');

const ConversationList = ({
  conversations,
  activeUserId,
  onSelect,
  followingUsers = [],
  search,
  onSearchChange,
}) => {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filteredFollowingUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return followingUsers;

    return followingUsers.filter((user) =>
      [user.username, user.fullName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [followingUsers, query]);

  const startConversation = (userId) => {
    onSelect(userId);
    setIsComposerOpen(false);
    setQuery('');
  };

  return (
    <>
      <div className="flex h-full min-h-0 flex-col border-r border-[#dbdbdb] dark:border-[#262626]">
        <div className="shrink-0 border-b border-[#dbdbdb] px-6 py-5 dark:border-[#262626]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Messages</h2>
              <p className="mt-1 text-xs text-[#8e8e8e] dark:text-[#a8a8a8]">
                Search, pin, and start new chats
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsComposerOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dbdbdb] transition hover:bg-[#f5f5f5] dark:border-[#262626] dark:hover:bg-[#121212]"
              aria-label="Start new message"
            >
              <PlusSquare size={20} />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#dbdbdb] px-4 py-3 dark:border-[#262626]">
            <Search size={16} className="text-[#8e8e8e]" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search messages"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="px-6 py-6 text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
              No conversations yet. Tap the `+` button to start messaging someone you follow.
            </div>
          ) : (
            conversations.map((conversation) => {
              const conversationUserId = getEntityId(conversation.user);

              return (
                <button
                  key={conversationUserId}
                  type="button"
                  onClick={() => onSelect(conversationUserId)}
                  className={`flex w-full items-center gap-3 px-6 py-3 text-left ${
                    getEntityId(activeUserId) === conversationUserId
                      ? 'bg-[#fafafa] dark:bg-[#121212]'
                      : 'hover:bg-[#fafafa] dark:hover:bg-[#121212]'
                  }`}
                >
                  <img
                    src={conversation.user?.profilePicture?.url}
                    alt={conversation.user?.username}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {conversation.user?.username}
                      </p>
                      {conversation.pinned && <Pin size={12} className="text-[#0095f6]" fill="currentColor" />}
                    </div>
                    <p className="truncate text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
                      {conversation.lastMessage?.isUnsent
                        ? 'Message unsent'
                        : conversation.lastMessage?.sharedPost
                          ? 'Shared a post'
                          : conversation.lastMessage?.text || 'Sent a media message'}
                    </p>
                  </div>
                  {conversation.unreadCount > 0 && (
                    <span className="rounded-full bg-[#ff3040] px-2 py-0.5 text-xs font-semibold text-white">
                      {conversation.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {isComposerOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4">
          <div className="ig-surface w-full max-w-md rounded-3xl bg-white p-0 shadow-2xl dark:bg-black">
            <div className="flex items-center justify-between border-b border-[#dbdbdb] px-5 py-4 dark:border-[#262626]">
              <div>
                <h3 className="text-base font-semibold">New message</h3>
                <p className="mt-1 text-xs text-[#8e8e8e] dark:text-[#a8a8a8]">
                  Search people you follow
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsComposerOpen(false);
                  setQuery('');
                }}
                className="rounded-full p-2 text-[#8e8e8e] transition hover:bg-[#f5f5f5] dark:hover:bg-[#121212]"
                aria-label="Close new message"
              >
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-[#dbdbdb] px-4 py-4 dark:border-[#262626]">
              <div className="flex items-center gap-3 rounded-2xl border border-[#dbdbdb] px-4 py-3 dark:border-[#262626]">
                <Search size={16} className="text-[#8e8e8e]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by username or name"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto px-2 py-2">
              {filteredFollowingUsers.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
                  {followingUsers.length === 0
                    ? 'You are not following anyone yet.'
                    : 'No matching users found.'}
                </div>
              ) : (
                filteredFollowingUsers.map((user) => (
                  <button
                    key={user._id}
                    type="button"
                    onClick={() => startConversation(user._id)}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-[#f5f5f5] dark:hover:bg-[#121212]"
                  >
                    <img
                      src={user.profilePicture?.url}
                      alt={user.username}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{user.username}</p>
                      <p className="truncate text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
                        {user.fullName || 'Instagraam user'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConversationList;
