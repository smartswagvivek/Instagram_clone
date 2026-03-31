import { Toaster } from 'react-hot-toast';

export const ToastProvider = () => (
  <Toaster
    position="bottom-center"
    reverseOrder={false}
    gutter={8}
    toastOptions={{
      duration: 4000,
      style: {
        background: '#262626',
        color: '#fff',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        fontSize: '14px',
        fontWeight: '500',
      },
      success: {
        style: {
          background: '#31a24c',
        },
        icon: '✅',
      },
      error: {
        style: {
          background: '#ed4956',
        },
        icon: '❌',
      },
    }}
  />
);
