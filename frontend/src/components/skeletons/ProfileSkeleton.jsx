export const ProfileHeaderSkeleton = () => (
  <div className="border-b border-[#e5e5e5] dark:border-[#262626] pb-8 animate-pulse">
    <div className="flex items-start gap-8 mb-6">
      <div className="h-32 w-32 rounded-full bg-[#e5e5e5] dark:bg-[#262626] flex-shrink-0" />
      <div className="flex-1">
        <div className="h-6 w-32 bg-[#e5e5e5] dark:bg-[#262626] rounded mb-4" />
        <div className="flex gap-4 mb-6">
          <div className="h-8 w-20 bg-[#e5e5e5] dark:bg-[#262626] rounded" />
          <div className="h-8 w-20 bg-[#e5e5e5] dark:bg-[#262626] rounded" />
          <div className="h-8 w-20 bg-[#e5e5e5] dark:bg-[#262626] rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-32 bg-[#e5e5e5] dark:bg-[#262626] rounded" />
          <div className="h-4 w-full bg-[#e5e5e5] dark:bg-[#262626] rounded" />
          <div className="h-4 w-5/6 bg-[#e5e5e5] dark:bg-[#262626] rounded" />
        </div>
      </div>
    </div>
  </div>
);

export const ProfileGridSkeleton = () => (
  <div className="grid grid-cols-3 gap-4 animate-pulse">
    {Array.from({ length: 9 }).map((_, i) => (
      <div key={i} className="aspect-square bg-[#e5e5e5] dark:bg-[#262626] rounded" />
    ))}
  </div>
);
