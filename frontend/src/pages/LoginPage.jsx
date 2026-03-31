import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import InstagramLogo from '../components/shared/InstagramLogo';
import { login } from '../redux/slices/authSlice';

const footerLinks = ['About', 'Help', 'Press', 'API', 'Privacy', 'Terms', 'Locations'];

const previews = [
  'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
];

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, loading, error } = useSelector((state) => state.auth);
  const [form, setForm] = useState({ identifier: '', password: '' });

  useEffect(() => {
    if (isAuthenticated) navigate('/feed');
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await dispatch(login(form));
    if (!result.error) navigate('/feed');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa] dark:bg-black">
      <div className="mx-auto flex w-full max-w-[1100px] flex-1 items-center justify-center px-4 py-10">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_380px]">
          <div className="hidden items-center justify-center lg:flex">
            <div className="relative h-[620px] w-[540px]">
              <div className="absolute left-0 top-6 h-[560px] w-[270px] rounded-[42px] border border-[#dbdbdb] bg-black p-3 shadow-xl">
                <img
                  src={previews[0]}
                  alt="Instagram mobile preview"
                  className="h-full w-full rounded-[32px] object-cover"
                />
              </div>
              <div className="absolute right-8 top-0 h-[590px] w-[280px] rounded-[42px] border border-[#dbdbdb] bg-black p-3 shadow-2xl">
                <img
                  src={previews[1]}
                  alt="Instagram mobile preview"
                  className="h-full w-full rounded-[32px] object-cover"
                />
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[380px]">
            <div className="ig-surface bg-white px-10 py-10 text-center dark:bg-black">
              <div className="mb-8 flex justify-center">
                <InstagramLogo className="justify-center" />
              </div>

              <form className="space-y-2" onSubmit={handleSubmit}>
                <input
                  className="ig-input"
                  placeholder="Phone number, username, or email"
                  value={form.identifier}
                  onChange={(event) => setForm((prev) => ({ ...prev, identifier: event.target.value }))}
                />
                <input
                  className="ig-input"
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                />
                {error && <p className="text-sm text-rose-500">{error}</p>}
                <button type="submit" disabled={loading} className="ig-button-primary mt-3 w-full">
                  {loading ? 'Signing in...' : 'Log in'}
                </button>
              </form>

              <div className="my-5 flex items-center gap-4">
                <span className="h-px flex-1 bg-[#dbdbdb] dark:bg-[#262626]" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8e8e8e]">or</span>
                <span className="h-px flex-1 bg-[#dbdbdb] dark:bg-[#262626]" />
              </div>

              <p className="text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
                Share photos and videos, message instantly, and explore what people you know are creating.
              </p>
            </div>

            <div className="ig-surface mt-3 bg-white px-8 py-5 text-center text-sm dark:bg-black">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="font-semibold text-[#0095f6]">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>

      <footer className="px-4 pb-8 pt-4">
        <div className="mx-auto flex max-w-[900px] flex-wrap justify-center gap-4 text-xs text-[#8e8e8e] dark:text-[#737373]">
          {footerLinks.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
