import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { createPost, createStory } from '../redux/slices/postsSlice';
import { showToast } from '../redux/slices/uiSlice';

const CreatePostPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const createStatus = useSelector((state) => state.posts.createStatus);
  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [isReel, setIsReel] = useState(false);
  const type = searchParams.get('type') === 'story' ? 'story' : 'post';

  const previewUrl = useMemo(() => (files[0] ? URL.createObjectURL(files[0]) : null), [files]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    files.forEach((file) => formData.append(type === 'story' ? 'media' : 'media', file));
    formData.append('caption', caption);
    if (type === 'post') {
      formData.append('location', location);
      formData.append('isReel', String(isReel));
    }

    const result = await dispatch(type === 'story' ? createStory(formData) : createPost(formData));

    if (!result.error) {
      dispatch(
        showToast({
          tone: 'success',
          message: type === 'story' ? 'Story created successfully.' : 'Post published successfully.',
        })
      );
      navigate(type === 'story' ? '/feed' : '/feed');
      return;
    }

    dispatch(showToast({ tone: 'error', message: result.payload || `Unable to create ${type}.` }));
  };

  return (
    <div className="mx-auto max-w-[975px] px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{type === 'story' ? 'Create new story' : 'Create new post'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="ig-surface grid gap-0 rounded-xl lg:grid-cols-[1fr_340px]">
        <div className="border-b border-[#dbdbdb] p-4 dark:border-[#262626] lg:border-b-0 lg:border-r">
          <label className="flex min-h-[420px] cursor-pointer items-center justify-center rounded-md bg-[#fafafa] text-center dark:bg-[#121212]">
            <input
              type="file"
              accept="image/*,video/*"
              multiple={type !== 'story'}
              className="hidden"
              onChange={(event) => setFiles(Array.from(event.target.files || []))}
            />
            {previewUrl ? (
              files[0]?.type?.startsWith('video') ? (
                <video src={previewUrl} controls className="h-[420px] w-full rounded-md object-cover" />
              ) : (
                <img src={previewUrl} alt="Preview" className="h-[420px] w-full rounded-md object-cover" />
              )
            ) : (
              <div>
                <p className="text-lg font-semibold">
                  {type === 'story' ? 'Select a photo or video for your story' : 'Drag photos and videos here'}
                </p>
              </div>
            )}
          </label>
        </div>

        <div className="p-5">
          <div className="space-y-4">
            <textarea
              rows={6}
              className="ig-input"
              placeholder={type === 'story' ? 'Write a short story caption...' : 'Write a caption with hashtags...'}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
            />

            {type === 'post' && (
              <>
                <input
                  className="ig-input"
                  placeholder="Location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
                <label className="flex items-center justify-between rounded-md border border-[#dbdbdb] px-4 py-3 dark:border-[#262626]">
                  <span>Publish as reel</span>
                  <input type="checkbox" checked={isReel} onChange={() => setIsReel((value) => !value)} />
                </label>
              </>
            )}

            <button type="submit" className="ig-button-primary w-full">
              {createStatus === 'loading'
                ? 'Publishing...'
                : type === 'story'
                  ? 'Share story'
                  : 'Publish now'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreatePostPage;
