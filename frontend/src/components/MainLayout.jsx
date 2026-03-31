import { Moon, Sun } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { toggleTheme } from '../redux/slices/uiSlice';
import CreateMenuModal from './CreateMenuModal';
import MobileBottomNav from './MobileBottomNav';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import ToastViewport from './shared/ToastViewport';

const MainLayout = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { unreadCount } = useSelector((state) => state.notifications);
  const { theme } = useSelector((state) => state.ui);

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#262626] dark:bg-black dark:text-[#f5f5f5]">
      <Navbar />
      <ToastViewport />
      <CreateMenuModal />

      <div className="flex w-full">
        <Sidebar />

        <main className="flex-1 overflow-y-auto pb-20 lg:ml-[250px] lg:pb-0">
          <div className="sticky top-0 z-20 hidden border-b border-[#dbdbdb] bg-white/95 px-6 py-3 backdrop-blur dark:border-[#262626] dark:bg-black/95 lg:flex lg:items-center lg:justify-end lg:gap-2">
            <button
              type="button"
              onClick={() => dispatch(toggleTheme())}
              className="rounded-full p-2 transition hover:bg-[#f5f5f5] dark:hover:bg-[#121212]"
              aria-label="Toggle appearance"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
          <Outlet />
        </main>

        <aside className="hidden w-[319px] shrink-0 px-6 py-8 xl:block">
          <div className="sticky top-8 space-y-6">
            <div className="flex items-center gap-3">
              <img
                src={user?.profilePicture?.url}
                alt={user?.username}
                className="h-14 w-14 rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-semibold leading-[18px]">{user?.username}</p>
                <p className="text-sm leading-[18px] text-[#8e8e8e] dark:text-[#a8a8a8]">
                  {user?.fullName}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#efefef] p-4 dark:border-[#1f1f1f]">
              <div className="flex items-center justify-between text-sm">
                <p className="font-semibold">Notifications</p>
                <span className="rounded-full bg-[#ff3040] px-2 py-0.5 text-xs font-semibold text-white">
                  {unreadCount}
                </span>
              </div>
              <p className="mt-2 text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
                {user?.isPrivate ? 'Private account' : 'Public account'} with {user?.following?.length || 0}{' '}
                following.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <MobileBottomNav />
    </div>
  );
};

export default MainLayout;
