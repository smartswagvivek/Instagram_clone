import { Heart, MessageSquare, Search } from 'lucide-react';

const EmptyStates = {
  noPosts: () => (
    <div className="py-12 text-center">
      <Heart className="h-16 w-16 mx-auto mb-4 text-[#8e8e8e] dark:text-[#a8a8a8]" />
      <h3 className="text-lg font-semibold mb-2">No Posts</h3>
      <p className="text-[#8e8e8e] dark:text-[#a8a8a8]">This user hasn't posted yet</p>
    </div>
  ),

  noFeed: () => (
    <div className="py-12 text-center">
      <MessageSquare className="h-16 w-16 mx-auto mb-4 text-[#8e8e8e] dark:text-[#a8a8a8]" />
      <h3 className="text-lg font-semibold mb-2">No posts in your feed</h3>
      <p className="text-[#8e8e8e] dark:text-[#a8a8a8]">Follow more users to see their posts</p>
    </div>
  ),

  noMessages: () => (
    <div className="py-12 text-center">
      <MessageSquare className="h-16 w-16 mx-auto mb-4 text-[#8e8e8e] dark:text-[#a8a8a8]" />
      <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
      <p className="text-[#8e8e8e] dark:text-[#a8a8a8]">Start messaging to begin a conversation</p>
    </div>
  ),

  noNotifications: () => (
    <div className="py-12 text-center">
      <Heart className="h-16 w-16 mx-auto mb-4 text-[#8e8e8e] dark:text-[#a8a8a8]" />
      <h3 className="text-lg font-semibold mb-2">No notifications</h3>
      <p className="text-[#8e8e8e] dark:text-[#a8a8a8]">You're all caught up!</p>
    </div>
  ),

  noSearchResults: (query) => (
    <div className="py-12 text-center">
      <Search className="h-16 w-16 mx-auto mb-4 text-[#8e8e8e] dark:text-[#a8a8a8]" />
      <h3 className="text-lg font-semibold mb-2">No results for "{query}"</h3>
      <p className="text-[#8e8e8e] dark:text-[#a8a8a8]">Try searching for something else</p>
    </div>
  ),
};

export default EmptyStates;
