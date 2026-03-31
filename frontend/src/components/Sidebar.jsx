import {
  Bookmark,
  Compass,
  Heart,
  Home,
  LogOut,
  MessageCircle,
  PlusSquare,
  ShieldCheck,
  User,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { logoutUser } from '../redux/slices/authSlice';
import { openCreateMenu } from '../redux/slices/uiSlice';
import InstagramLogo from './shared/InstagramLogo';

const links = [
  { to: '/feed', label: 'Home', icon: Home },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/messages', label: 'Messages', icon: MessageCircle },
  { to: '/notifications', label: 'Notifications', icon: Heart },
  { to: '/saved', label: 'Saved', icon: Bookmark },
  { to: '/profile', label: 'Profile', icon: User },
];

const Sidebar = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const navItemClass = ({ isActive }) =>
    `ig-nav-item ${isActive ? 'ig-nav-item-active' : ''}`;

  return (
    <aside className="fixed hidden h-screen w-[250px] border-r border-[#dbdbdb] bg-white px-3 py-6 dark:border-[#262626] dark:bg-black lg:block">
      <div className="flex h-full flex-col">
        <div className="px-3 pb-8 pt-1">
          <InstagramLogo />
        </div>

        <nav className="space-y-2">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={navItemClass}>
              {({ isActive }) => (
                <>
                  <Icon
                    size={24}
                    strokeWidth={isActive ? 2.7 : 2.1}
                    className={isActive ? 'scale-[1.02]' : ''}
                  />
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => dispatch(openCreateMenu())}
            className="ig-nav-item w-full text-left"
          >
            <PlusSquare size={24} />
            <span>Create</span>
          </button>

          {user?.role === 'admin' && (
            <NavLink to="/admin" className={navItemClass}>
              {({ isActive }) => (
                <>
                  <ShieldCheck size={24} strokeWidth={isActive ? 2.7 : 2.1} />
                  <span>Admin</span>
                </>
              )}
            </NavLink>
          )}
        </nav>

        <div className="mt-auto space-y-2">
          <button
            type="button"
            onClick={() => dispatch(logoutUser())}
            className="ig-nav-item w-full text-left"
          >
            <LogOut size={24} />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
