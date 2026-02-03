import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { createApi } from '../services/api';

export const LoginPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const setToken = useAuthStore((state) => state.setToken);
  const api = createApi();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/auth/login', { password });
      setToken(response.data.token);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="w-full max-w-md p-8 space-y-8 bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Hub Chat</h1>
          <p className="mt-2 text-zinc-400">Enter your master password to continue</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <input
              type="password"
              required
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};
