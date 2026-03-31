import { ImagePlus, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { closeCreateMenu } from '../redux/slices/uiSlice';

const actions = [
  {
    to: '/create?type=post',
    label: 'Create Post',
    description: 'Upload images, videos, and carousel posts.',
    icon: ImagePlus,
  },
  {
    to: '/create?type=story',
    label: 'Create Story',
    description: 'Share a story that expires in 24 hours.',
    icon: Sparkles,
  },
];

const CreateMenuModal = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.ui.createMenuOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4">
      <div className="ig-surface w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-black">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create</h2>
          <button
            type="button"
            onClick={() => dispatch(closeCreateMenu())}
            className="text-sm text-[#8e8e8e]"
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          {actions.map(({ to, label, description, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => dispatch(closeCreateMenu())}
              className="flex items-center gap-4 rounded-2xl border border-[#efefef] p-4 transition hover:bg-[#fafafa] dark:border-[#1f1f1f] dark:hover:bg-[#121212]"
            >
              <div className="rounded-2xl bg-[#f5f5f5] p-3 dark:bg-[#121212]">
                <Icon size={20} />
              </div>
              <div>
                <p className="font-semibold">{label}</p>
                <p className="text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CreateMenuModal;
