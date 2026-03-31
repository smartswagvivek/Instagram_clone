import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { signup } from '../redux/slices/authSlice';
import api from '../services/api';

const initialAvailability = {
  email: { checking: false, available: null, message: '' },
  username: { checking: false, available: null, message: '' },
};

const SignupPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, loading, error } = useSelector((state) => state.auth);
  const [form, setForm] = useState({
    email: '',
    username: '',
    fullName: '',
    password: '',
    isPrivate: false,
  });
  const [localError, setLocalError] = useState('');
  const [availability, setAvailability] = useState(initialAvailability);

  useEffect(() => {
    if (isAuthenticated) navigate('/feed');
  }, [isAuthenticated, navigate]);

  const normalized = useMemo(
    () => ({
      email: form.email.trim().toLowerCase(),
      username: form.username.trim().toLowerCase(),
      fullName: form.fullName.trim(),
      password: form.password,
      isPrivate: Boolean(form.isPrivate),
    }),
    [form]
  );

  const checkAvailability = async (field, explicitValue) => {
    const value = explicitValue ?? normalized[field];
    if (!value) {
      setAvailability((prev) => ({
        ...prev,
        [field]: { checking: false, available: null, message: '' },
      }));
      return true;
    }

    setAvailability((prev) => ({
      ...prev,
      [field]: { checking: true, available: prev[field].available, message: '' },
    }));

    try {
      const params = new URLSearchParams({ [field]: value });
      const { data } = await api.get(`/auth/check-availability?${params.toString()}`);
      setAvailability((prev) => ({
        ...prev,
        [field]: {
          checking: false,
          available: data[field].available,
          message: data[field].message,
        },
      }));
      return data[field].available;
    } catch (availabilityError) {
      setAvailability((prev) => ({
        ...prev,
        [field]: {
          checking: false,
          available: null,
          message:
            availabilityError.response?.data?.message ||
            `Could not check ${field} right now.`,
        },
      }));
      return false;
    }
  };

  const validateForm = () => {
    if (!normalized.email || !normalized.fullName || !normalized.username || !normalized.password) {
      return 'All fields are required.';
    }

    if (!/^\S+@\S+\.\S+$/.test(normalized.email)) {
      return 'Enter a valid email address.';
    }

    if (!/^[a-z0-9_.]{3,30}$/.test(normalized.username)) {
      return 'Username must be 3-30 characters and only use letters, numbers, dots, or underscores.';
    }

    if (normalized.password.length < 6) {
      return 'Password must be at least 6 characters.';
    }

    if (availability.email.available === false) {
      return availability.email.message || 'Email already registered.';
    }

    if (availability.username.available === false) {
      return availability.username.message || 'Username already taken.';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateForm();
    setLocalError(validationError);
    if (validationError) return;

    const [emailAvailable, usernameAvailable] = await Promise.all([
      checkAvailability('email', normalized.email),
      checkAvailability('username', normalized.username),
    ]);

    if (!emailAvailable) {
      setLocalError('Email already registered. Please use another email.');
      return;
    }

    if (!usernameAvailable) {
      setLocalError('Username already taken. Please change your username.');
      return;
    }

    const result = await dispatch(signup(normalized));
    if (!result.error) navigate('/feed');
  };

  const renderAvailability = (field) => {
    const state = availability[field];
    if (state.checking) {
      return <p className="text-xs text-[#8e8e8e]">Checking {field}...</p>;
    }
    if (!state.message) return null;

    return (
      <p className={`text-xs ${state.available ? 'text-green-600' : 'text-rose-500'}`}>
        {state.message}
      </p>
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4 py-10 dark:bg-black">
      <div className="w-full max-w-[350px]">
        <div className="ig-surface bg-white px-10 py-8 text-center dark:bg-black">
          <h1 className="text-[40px] font-semibold">Instagram</h1>
          <p className="mt-4 text-[17px] font-semibold text-[#737373]">
            Sign up to see photos and videos from your friends.
          </p>

          <form className="mt-6 grid gap-2" onSubmit={handleSubmit}>
            <input
              className="ig-input"
              placeholder="Email"
              value={form.email}
              onBlur={() => checkAvailability('email')}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, email: event.target.value }));
                setLocalError('');
                setAvailability((prev) => ({
                  ...prev,
                  email: { checking: false, available: null, message: '' },
                }));
              }}
            />
            {renderAvailability('email')}

            <input
              className="ig-input"
              placeholder="Full name"
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
            />

            <input
              className="ig-input"
              placeholder="Username"
              value={form.username}
              onBlur={() => checkAvailability('username')}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, username: event.target.value.toLowerCase() }));
                setLocalError('');
                setAvailability((prev) => ({
                  ...prev,
                  username: { checking: false, available: null, message: '' },
                }));
              }}
            />
            {renderAvailability('username')}

            <input
              className="ig-input"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, password: event.target.value }));
                setLocalError('');
              }}
            />

            <div className="rounded-xl border border-[#dbdbdb] p-3 text-left dark:border-[#262626]">
              <p className="mb-2 text-sm font-semibold">Account type</p>
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="radio"
                  name="accountType"
                  checked={!form.isPrivate}
                  onChange={() => setForm((prev) => ({ ...prev, isPrivate: false }))}
                />
                <span>Public account</span>
              </label>
              <label className="mt-2 flex items-center gap-3 text-sm">
                <input
                  type="radio"
                  name="accountType"
                  checked={form.isPrivate}
                  onChange={() => setForm((prev) => ({ ...prev, isPrivate: true }))}
                />
                <span>Private account</span>
              </label>
            </div>

            {(localError || error) && <p className="text-sm text-rose-500">{localError || error}</p>}

            <button type="submit" disabled={loading} className="ig-button-primary mt-3">
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>
        </div>

        <div className="ig-surface mt-3 bg-white px-8 py-5 text-center text-sm dark:bg-black">
          Have an account?{' '}
          <Link to="/login" className="font-semibold text-[#0095f6]">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
