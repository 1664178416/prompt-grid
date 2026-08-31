'use client';

import Sidebar from '@/components/sidebar/Sidebar';
import PromptList from '@/components/prompt-list/PromptList';
import Editor from '@/components/editor/Editor';
import { useEffect, useState, useRef, useCallback } from 'react';
import { usePromptStore } from '@/store/usePromptStore';
import { useEnvironment } from '@/hooks/useEnvironment';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { useHydrated } from '@/hooks/useHydrated';
import { useSettingsStore, i18n } from '@/store/useSettingsStore';
import { useShallow } from 'zustand/react/shallow';
import dynamic from 'next/dynamic';

const CommandPalette = dynamic(() => import('@/components/command-palette/CommandPalette'));

function isEditableEventTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const editable = target.closest('input, textarea, select, [contenteditable]');
  if (!(editable instanceof HTMLElement)) return false;

  return editable.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(editable.tagName);
}

function GlobalShortcuts() {
  const { createPrompt, activeFolderId, setActivePrompt, deletePrompt, activePromptId } = usePromptStore(
    useShallow((state) => ({
      createPrompt: state.createPrompt,
      activeFolderId: state.activeFolderId,
      setActivePrompt: state.setActivePrompt,
      deletePrompt: state.deletePrompt,
      activePromptId: state.activePromptId,
    }))
  );
  const language = useSettingsStore((state) => state.language);
  const t = i18n[language];

  useEffect(() => {
    const down = async (e: KeyboardEvent) => {
      if (isEditableEventTarget(e.target)) return;

      if (e.key === 'n' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const id = await createPrompt(activeFolderId === 'favorites' ? null : activeFolderId);
        setActivePrompt(id);
      }
      if (e.key === 'Backspace' && (e.metaKey || e.ctrlKey)) {
        if (activePromptId) {
          e.preventDefault();
          if (window.confirm(t.confirmDeletePrompt)) {
            deletePrompt(activePromptId);
          }
        }
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [activeFolderId, activePromptId, createPrompt, setActivePrompt, deletePrompt, t.confirmDeletePrompt]);

  return null;
}

function CommandPaletteHost() {
  const { isCommandPaletteOpen, setCommandPaletteOpen } = usePromptStore(
    useShallow((state) => ({
      isCommandPaletteOpen: state.isCommandPaletteOpen,
      setCommandPaletteOpen: state.setCommandPaletteOpen,
    }))
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      } else if (event.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  return isCommandPaletteOpen ? <CommandPalette /> : null;
}

export default function Home() {
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [listWidth, setListWidth] = useState(320);
  const { isWeb } = useEnvironment();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const router = useRouter();
  const mounted = useHydrated();
  
  const isResizingSidebar = useRef(false);
  const isResizingList = useRef(false);
  const activeResizePointerId = useRef<number | null>(null);

  useEffect(() => {
    if (mounted && isWeb && !isLoggedIn) {
      router.push('/login');
    }
  }, [mounted, isWeb, isLoggedIn, router]);

  const stopResizing = useCallback(() => {
    isResizingSidebar.current = false;
    isResizingList.current = false;
    activeResizePointerId.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const startResizingSidebar = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activeResizePointerId.current = event.pointerId;
    isResizingSidebar.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const startResizingList = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activeResizePointerId.current = event.pointerId;
    isResizingList.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const resize = useCallback((pointerMoveEvent: PointerEvent) => {
    if (activeResizePointerId.current !== pointerMoveEvent.pointerId) return;
    pointerMoveEvent.preventDefault();

    if (isResizingSidebar.current) {
      const newWidth = pointerMoveEvent.clientX;
      if (newWidth > 180 && newWidth < 400) {
        setSidebarWidth(newWidth);
      }
    } else if (isResizingList.current) {
      const newWidth = pointerMoveEvent.clientX - sidebarWidth;
      if (newWidth > 200 && newWidth < 600) {
        setListWidth(newWidth);
      }
    }
  }, [sidebarWidth]);

  useEffect(() => {
    window.addEventListener('pointermove', resize);
    window.addEventListener('pointerup', stopResizing);
    window.addEventListener('pointercancel', stopResizing);
    window.addEventListener('blur', stopResizing);
    return () => {
      window.removeEventListener('pointermove', resize);
      window.removeEventListener('pointerup', stopResizing);
      window.removeEventListener('pointercancel', stopResizing);
      window.removeEventListener('blur', stopResizing);
    };
  }, [resize, stopResizing]);

  if (!mounted) return null;
  if (isWeb && !isLoggedIn) return null; // Avoid flicker before redirect

  return (
    <main className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <div style={{ width: sidebarWidth }} className="flex-shrink-0 relative">
        <Sidebar />
        <div 
          className="absolute top-0 -right-0.5 w-1.5 h-full cursor-col-resize touch-none hover:bg-indigo-500 bg-transparent transition-colors z-20"
          onPointerDown={startResizingSidebar}
        />
      </div>
      
      <div style={{ width: listWidth }} className="flex-shrink-0 relative">
        <PromptList />
        <div 
          className="absolute top-0 -right-0.5 w-1.5 h-full cursor-col-resize touch-none hover:bg-indigo-500 bg-transparent transition-colors z-20"
          onPointerDown={startResizingList}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <Editor />
      </div>
      
      <GlobalShortcuts />
      <CommandPaletteHost />
    </main>
  );
}
