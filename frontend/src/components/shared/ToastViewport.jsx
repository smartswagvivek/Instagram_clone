import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { clearToast } from '../../redux/slices/uiSlice';

const toneStyles = {
  default: 'bg-[#262626] text-white',
  success: 'bg-[#1f7a3d] text-white',
  error: 'bg-[#c13515] text-white',
};

const ToastViewport = () => {
  const dispatch = useDispatch();
  const toast = useSelector((state) => state.ui.toast);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = window.setTimeout(() => dispatch(clearToast()), 2600);
    return () => window.clearTimeout(timer);
  }, [dispatch, toast]);

  if (!toast?.message) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[70] -translate-x-1/2">
      <div
        className={`rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${toneStyles[toast.tone] || toneStyles.default}`}
      >
        {toast.message}
      </div>
    </div>
  );
};

export default ToastViewport;
