export const PostSkeleton = () => (
  <div className="mb-8 border border-[#e5e5e5] rounded-lg dark:border-[#262626] animate-pulse">
    <div className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-[#e5e5e5] dark:bg-[#262626]" />
        <div className="flex flex-col gap-2">
          <div className="h-4 w-24 bg-[#e5e5e5] dark:bg-[#262626] rounded" />
          <div className="h-3 w-16 bg-[#e5e5e5] dark:bg-[#262626] rounded" />
        </div>
      </div>
      <div className="h-4 w-4 bg-[#e5e5e5] dark:bg-[#262626] rounded" />
    </div>
    <div className="h-96 bg-[#e5e5e5] dark:bg-[#262626]" />
    <div className="p-4 space-y-3">
      <div className="flex gap-3">
        <div className="h-6 w-6 bg-[#e5e5e5] dark:bg-[#262626] rounded" />
        <div className="h-6 w-6 bg-[#e5e5e5] dark:bg-[#262626] rounded" />
        <div className="h-6 w-6 bg-[#e5e5e5] dark:bg-[#262626] rounded" />
      </div>
      <div className="h-4 w-32 bg-[#e5e5e5] dark:bg-[#262626] rounded" />
      <div className="h-3 w-full bg-[#e5e5e5] dark:bg-[#262626] rounded" />
      <div className="h-3 w-5/6 bg-[#e5e5e5] dark:bg-[#262626] rounded" />
    </div>
  </div>
);

export const SkeletonPostList = ({ count = 3 }) => (
  <div className="space-y-8">
    {Array.from({ length: count }).map((_, i) => (
      <PostSkeleton key={i} />
    ))}
  </div>
);
