'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Key, User } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuthStore();
  const router = useRouter();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      login(email);
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 selection:bg-indigo-500/30">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-500">
        {/* Logo Area */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center mb-4">
            <span className="text-white font-bold text-xl font-mono">PG</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
          <p className="text-sm text-gray-500 mt-2">Get started with PromptGrid</p>
        </div>

        {/* Card */}
        <div className="bg-panel border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleRegister} className="space-y-4">
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-indigo-500 text-white font-medium rounded-xl py-2.5 hover:bg-indigo-600 transition-colors mt-2 shadow-sm"
            >
              Sign Up
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-panel px-2 text-gray-400">Or sign up with</span>
            </div>
          </div>

          <button className="w-full bg-background border border-border text-foreground font-medium rounded-xl py-2.5 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            Sign up with GitHub
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Already have an account?{' '}
          <Link href="/login" className="text-foreground hover:text-indigo-500 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
