import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import api from '../services/api';

const DiscoveryPage = ({ mode = 'hashtag' }) => {
  const params = useParams();
  const [items, setItems] = useState([]);
  const [label, setLabel] = useState('');

  useEffect(() => {
    const run = async () => {
      const value = mode === 'hashtag' ? params.tag : params.location;
      if (!value) return;
      const { data } = await api.get(
        mode === 'hashtag' ? `/posts/hashtag/${value}` : `/posts/location/${encodeURIComponent(value)}`
      );
      setItems(data.posts || []);
      setLabel(data.tag || data.location || value);
    };

    run();
  }, [mode, params.location, params.tag]);

  return (
    <div className="mx-auto max-w-[975px] px-4 py-8">
      <h1 className="text-2xl font-semibold">
        {mode === 'hashtag' ? '#' : ''}{label}
      </h1>
      <p className="mt-2 text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
        {items.length} public posts
      </p>

      <section className="mt-8 grid grid-cols-3 gap-1">
        {items.map((post) => (
          <div key={post._id} className="aspect-square overflow-hidden bg-[#fafafa] dark:bg-[#121212]">
            <img src={post.media?.[0]?.url} alt={post.caption} className="h-full w-full object-cover" />
          </div>
        ))}
      </section>
    </div>
  );
};

export default DiscoveryPage;
