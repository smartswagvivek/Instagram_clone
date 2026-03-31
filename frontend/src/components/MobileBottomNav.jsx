import { Compass, Home, MessageCircle, PlusSquare, Search, UserCircle2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import { openCreateMenu } from '../redux/slices/uiSlice';

const links = [
  { to: '/feed', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/explore', icon: Compass, label: 'Explore' },
  { action: 'create', icon: PlusSquare, label: 'Create' },
  { to: '/messages', icon: MessageCircle, label: 'Messages' },
  { to: '/profile', icon: UserCircle2, label: 'Profile' },
];

const MobileBottomNav = () => {
  const dispatch = useDispatch();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dbdbdb] bg-white/95 backdrop-blur dark:border-[#262626] dark:bg-black/95 lg:hidden">
      <div className="flex w-full items-center justify-around px-2 py-2">
        {links.map(({ to, icon: Icon, label, action }) =>
          action === 'create' ? (
            <button
              key={label}
              type="button"
              onClick={() => dispatch(openCreateMenu())}
              className="rounded-2xl p-3 transition hover:bg-[#f5f5f5] dark:hover:bg-[#121212]"
              aria-label={label}
            >
              <Icon size={24} />
            </button>
          ) : (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `rounded-2xl p-3 transition hover:bg-[#f5f5f5] dark:hover:bg-[#121212] ${
                  isActive ? 'bg-[#f5f5f5] dark:bg-[#121212]' : ''
                }`
              }
              aria-label={label}
            >
              {({ isActive }) => <Icon size={24} strokeWidth={isActive ? 2.7 : 2.1} />}
            </NavLink>
          )
        )}
      </div>
    </div>
  );
};

export default MobileBottomNav;
