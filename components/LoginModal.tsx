import React, { useState } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (handle: string, appPassword: string) => Promise<void>;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onConnect }) => {
  const [handle, setHandle] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await onConnect(handle, appPassword);
    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl p-8 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-100">Connect to Bluesky</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">&times;</button>
        </div>

        {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="handle" className="block text-sm font-medium text-slate-300 mb-1">Bluesky Handle</label>
            <input
              id="handle"
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="your-name.bsky.social"
              className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 px-3 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              required
            />
          </div>
          <div>
            <label htmlFor="appPassword" className="block text-sm font-medium text-slate-300 mb-1">App Password</label>
            <input
              id="appPassword"
              type="password"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              placeholder="xxxx-xxxx-xxxx-xxxx"
              className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 px-3 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              required
            />
          </div>
          <div className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded-md">
            <strong>What's an app password?</strong> For security, connect using an app password instead of your main password. You can create one in Bluesky under Settings &gt; App Passwords.
            <a href="https://bsky.app/settings/app-passwords" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline ml-1">Create one now</a>
          </div>
          <div className="flex justify-end items-center gap-4 pt-4">
            <button type="button" onClick={onClose} className="text-slate-300 font-medium py-2 px-4 rounded-md hover:bg-slate-700 transition">Cancel</button>
            <button
              type="submit"
              disabled={isLoading || !handle || !appPassword}
              className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-500 transition disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;