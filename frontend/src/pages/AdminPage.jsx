import { useEffect, useState } from 'react';

import api from '../services/api';

const AdminPage = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [statsResponse, usersResponse, postsResponse] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/posts?flaggedOnly=true'),
      ]);

      setStats(statsResponse.data.stats);
      setUsers(usersResponse.data.users);
      setPosts(postsResponse.data.posts);
    };

    load();
  }, []);

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
          Admin control
        </p>
        <h1 className="mt-2 text-4xl font-bold">Operations dashboard</h1>
      </div>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="glass-card rounded-[28px] p-5">
            <p className="text-sm capitalize text-slate-500 dark:text-slate-400">{key}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="glass-card rounded-[28px] p-5">
          <h2 className="text-xl font-bold">Newest users</h2>
          <div className="mt-4 space-y-3">
            {users.slice(0, 6).map((user) => (
              <div key={user._id} className="flex items-center justify-between rounded-2xl bg-black/5 px-4 py-3 dark:bg-white/5">
                <div>
                  <p className="font-semibold">{user.fullName || user.username}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</p>
                </div>
                <span className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  {user.isActive ? 'active' : 'paused'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-[28px] p-5">
          <h2 className="text-xl font-bold">Flagged posts</h2>
          <div className="mt-4 space-y-3">
            {posts.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No flagged posts right now.</p>
            ) : (
              posts.map((post) => (
                <div key={post._id} className="rounded-2xl bg-black/5 px-4 py-3 dark:bg-white/5">
                  <p className="font-semibold">@{post.author?.username}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{post.caption}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminPage;
