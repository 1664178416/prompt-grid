'use client';

import Sidebar from '@/components/sidebar/Sidebar';
import PromptList from '@/components/prompt-list/PromptList';
import Editor from '@/components/editor/Editor';
import { useEffect, useState, useRef, useCallback } from 'react';
import { usePromptStore } from '@/store/usePromptStore';
import { useEnvironment } from '@/hooks/useEnvironment';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';

function GlobalShortcuts() {
  const { createPrompt, activeFolderId, setActivePrompt, deletePrompt, activePromptId } = usePromptStore();

  useEffect(() => {
    const down = async (e: KeyboardEvent) => {
      if (e.key === 'n' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const id = await createPrompt(activeFolderId === 'favorites' ? null : activeFolderId);
        setActivePrompt(id);
      }
      if (e.key === 'Backspace' && (e.metaKey || e.ctrlKey)) {
        if (activePromptId) {
          e.preventDefault();
          deletePrompt(activePromptId);
        }
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [activeFolderId, activePromptId, createPrompt, setActivePrompt, deletePrompt]);

  return null;
}

export default function Home() {
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [listWidth, setListWidth] = useState(320);
  const { isWeb } = useEnvironment();
  const { isLoggedIn } = useAuthStore();
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  
  const isResizingSidebar = useRef(false);
  const isResizingList = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isWeb && !isLoggedIn) {
      router.push('/login');
    }
  }, [mounted, isWeb, isLoggedIn, router]);

  const startResizingSidebar = useCallback(() => {
    isResizingSidebar.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const startResizingList = useCallback(() => {
    isResizingList.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    isResizingSidebar.current = false;
    isResizingList.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizingSidebar.current) {
      const newWidth = mouseMoveEvent.clientX;
      if (newWidth > 180 && newWidth < 400) {
        setSidebarWidth(newWidth);
      }
    } else if (isResizingList.current) {
      const newWidth = mouseMoveEvent.clientX - sidebarWidth;
      if (newWidth > 200 && newWidth < 600) {
        setListWidth(newWidth);
      }
    }
  }, [sidebarWidth]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  if (!mounted) return null;
  if (isWeb && !isLoggedIn) return null; // Avoid flicker before redirect

  return (
    <main className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <div style={{ width: sidebarWidth }} className="flex-shrink-0 relative">
        <Sidebar />
        <div 
          className="absolute top-0 -right-0.5 w-1.5 h-full cursor-col-resize hover:bg-indigo-500 bg-transparent transition-colors z-20"
          onMouseDown={startResizingSidebar}
        />
      </div>
      
      <div style={{ width: listWidth }} className="flex-shrink-0 relative">
        <PromptList />
        <div 
          className="absolute top-0 -right-0.5 w-1.5 h-full cursor-col-resize hover:bg-indigo-500 bg-transparent transition-colors z-20"
          onMouseDown={startResizingList}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <Editor />
      </div>
      
      <GlobalShortcuts />
    </main>
  );
}
