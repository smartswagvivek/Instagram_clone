import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  changePassword,
  fetchSettings,
  updatePrivacySettings,
} from '../redux/slices/postsSlice';
import { showToast } from '../redux/slices/uiSlice';

const SettingsPage = () => {
  const dispatch = useDispatch();
  const settings = useSelector((state) => state.posts.settings);
  const authUser = useSelector((state) => state.auth.user);
  const [privacy, setPrivacy] = useState({
    isPrivate: false,
    allowMessageRequestsFromEveryone: false,
    showActivityStatus: true,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
  });

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  useEffect(() => {
    if (!settings && !authUser) return;
    setPrivacy({
      isPrivate: Boolean(authUser?.isPrivate),
      allowMessageRequestsFromEveryone: Boolean(settings?.accountSettings?.allowMessageRequestsFromEveryone),
      showActivityStatus: settings?.accountSettings?.showActivityStatus !== false,
    });
  }, [settings, authUser]);

  const savePrivacy = async () => {
    const result = await dispatch(updatePrivacySettings(privacy));
    dispatch(
      showToast({
        tone: result.error ? 'error' : 'success',
        message: result.error ? result.payload || 'Unable to update settings.' : 'Settings updated successfully.',
      })
    );
  };

  const savePassword = async () => {
    const result = await dispatch(changePassword(passwordForm));
    dispatch(
      showToast({
        tone: result.error ? 'error' : 'success',
        message: result.error ? result.payload || 'Unable to change password.' : 'Password updated successfully.',
      })
    );
    if (!result.error) {
      setPasswordForm({ currentPassword: '', newPassword: '' });
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-2 text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
        Manage privacy, account security, and message preferences.
      </p>

      <section className="ig-surface mt-8 rounded-3xl p-6">
        <h2 className="text-lg font-semibold">Privacy</h2>
        <div className="mt-5 space-y-4">
          <label className="flex items-center justify-between rounded-2xl border border-[#dbdbdb] px-4 py-4 dark:border-[#262626]">
            <div>
              <p className="font-medium">Private account</p>
              <p className="text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">Only approved followers can see your posts.</p>
            </div>
            <input
              type="checkbox"
              checked={privacy.isPrivate}
              onChange={() => setPrivacy((prev) => ({ ...prev, isPrivate: !prev.isPrivate }))}
            />
          </label>

          <label className="flex items-center justify-between rounded-2xl border border-[#dbdbdb] px-4 py-4 dark:border-[#262626]">
            <div>
              <p className="font-medium">Message requests from everyone</p>
              <p className="text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">Allow people you do not follow to message you.</p>
            </div>
            <input
              type="checkbox"
              checked={privacy.allowMessageRequestsFromEveryone}
              onChange={() =>
                setPrivacy((prev) => ({
                  ...prev,
                  allowMessageRequestsFromEveryone: !prev.allowMessageRequestsFromEveryone,
                }))
              }
            />
          </label>

          <label className="flex items-center justify-between rounded-2xl border border-[#dbdbdb] px-4 py-4 dark:border-[#262626]">
            <div>
              <p className="font-medium">Show activity status</p>
              <p className="text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">Let others see when you are active.</p>
            </div>
            <input
              type="checkbox"
              checked={privacy.showActivityStatus}
              onChange={() => setPrivacy((prev) => ({ ...prev, showActivityStatus: !prev.showActivityStatus }))}
            />
          </label>
        </div>

        <button type="button" onClick={savePrivacy} className="ig-button-primary mt-5">
          Save privacy settings
        </button>
      </section>

      <section className="ig-surface mt-8 rounded-3xl p-6">
        <h2 className="text-lg font-semibold">Security</h2>
        <div className="mt-5 space-y-3">
          <input
            type="password"
            value={passwordForm.currentPassword}
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
            placeholder="Current password"
            className="ig-input"
          />
          <input
            type="password"
            value={passwordForm.newPassword}
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
            placeholder="New password"
            className="ig-input"
          />
        </div>
        <button type="button" onClick={savePassword} className="ig-button-primary mt-5">
          Change password
        </button>
      </section>
    </div>
  );
};

export default SettingsPage;
