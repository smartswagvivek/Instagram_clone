const ConversationList = ({ conversations, activeUserId, onSelect }) => {
  return (
    <div className="h-full border-r border-[#dbdbdb] dark:border-[#262626]">
      <div className="border-b border-[#dbdbdb] px-6 py-5 dark:border-[#262626]">
        <h2 className="text-base font-semibold">Messages</h2>
      </div>

      <div className="max-h-[calc(100vh-145px)] overflow-y-auto">
        {conversations.map((conversation) => (
          <button
            key={conversation.user?._id}
            type="button"
            onClick={() => onSelect(conversation.user?._id)}
            className={`flex w-full items-center gap-3 px-6 py-3 text-left ${
              activeUserId === conversation.user?._id
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
              <p className="truncate text-sm font-semibold">
                {conversation.user?.username}
              </p>
              <p className="truncate text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
                {conversation.lastMessage?.text || 'Sent a media message'}
              </p>
            </div>
            {conversation.unreadCount > 0 && (
              <span className="rounded-full bg-[#ff3040] px-2 py-0.5 text-xs font-semibold text-white">
                {conversation.unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ConversationList;
