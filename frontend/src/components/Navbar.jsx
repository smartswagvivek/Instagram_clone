import { Heart, LogOut, Moon, PlusSquare, Search, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { logoutUser } from '../redux/slices/authSlice';
import { openCreateMenu, toggleTheme } from '../redux/slices/uiSlice';
import InstagramLogo from './shared/InstagramLogo';

const Navbar = () => {
  const dispatch = useDispatch();
  const { unreadCount } = useSelector((state) => state.notifications);
  const { theme } = useSelector((state) => state.ui);

  return (
    <div className="sticky top-0 z-30 border-b border-[#dbdbdb] bg-white/95 backdrop-blur dark:border-[#262626] dark:bg-black/95 lg:hidden">
      <div className="flex w-full items-center justify-between px-4 py-3">
        <InstagramLogo className="h-8" />
        <div className="flex items-center gap-1">
          <button type="button" className="rounded-full p-2" onClick={() => dispatch(openCreateMenu())}>
            <PlusSquare size={22} />
          </button>
          <Link to="/search" className="rounded-full p-2">
            <Search size={22} />
          </Link>
          <Link to="/notifications" className="relative rounded-full p-2">
            <Heart size={22} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-[#ff3040] px-1.5 text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </Link>
          <button type="button" className="rounded-full p-2" onClick={() => dispatch(toggleTheme())}>
            {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
          </button>
          <button type="button" className="rounded-full p-2" onClick={() => dispatch(logoutUser())}>
            <LogOut size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
