import { useMemo, useState, useEffect } from 'react';

const ChatWindow = ({ conversation, activeUser, onSend, typing }) => {
  const [draft, setDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messages = useMemo(() => conversation || [], [conversation]);

  useEffect(() => {
    setIsTyping(typing);
  }, [typing]);

  const submit = (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    onSend(draft);
    setDraft('');
  };

  if (!activeUser) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
        Select a chat to start messaging.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#dbdbdb] px-6 py-4 dark:border-[#262626]">
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
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-6 py-6">
        {messages.map((message) => {
          const mine = message.sender?._id !== activeUser._id;
          return (
            <div key={message._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[236px] rounded-[22px] px-4 py-2.5 text-sm ${
                  mine
                    ? 'bg-[#efefef] text-[#262626] dark:bg-[#262626] dark:text-white'
                    : 'border border-[#dbdbdb] bg-white text-[#262626] dark:border-[#262626] dark:bg-black dark:text-white'
                }`}
              >
                {message.text || 'Shared media'}
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex justify-start">
            <div className="rounded-[22px] px-4 py-2.5 border border-[#dbdbdb] bg-white dark:border-[#262626] dark:bg-black">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-[#8e8e8e] animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-[#8e8e8e] animate-bounce" style={{ animationDelay: '0.1s' }} />
                <span className="h-2 w-2 rounded-full bg-[#8e8e8e] animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="border-t border-[#dbdbdb] p-4 dark:border-[#262626]">
        <div className="flex items-center gap-3 rounded-full border border-[#dbdbdb] px-4 py-2 dark:border-[#262626]">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Message..."
            className="w-full bg-transparent text-sm outline-none"
          />
          <button type="submit" className="text-sm font-semibold text-[#0095f6]">
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
