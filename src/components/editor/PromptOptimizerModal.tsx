'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { X, Sparkles, Loader2, Check } from 'lucide-react';
import { useSettingsStore, i18n } from '@/store/useSettingsStore';
import SimpleEditor from 'react-simple-code-editor';
import { getErrorMessage } from '@/lib/utils';
import { readChatCompletionStream, readChatError } from '@/lib/openai-stream';

interface PromptOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSystemPrompt: string;
  currentContent: string;
  onApply: (newSystem: string, newContent: string) => void;
}

export default function PromptOptimizerModal({
  isOpen,
  onClose,
  currentSystemPrompt,
  currentContent,
  onApply
}: PromptOptimizerModalProps) {
  const { language, apiKey, apiBaseUrl, defaultModel } = useSettingsStore();
  const t = i18n[language];

  const [status, setStatus] = useState<'idle' | 'optimizing' | 'success' | 'error'>('idle');
  const [resultText, setResultText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  
  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      setStatus('idle');
      setResultText('');
      setErrorMsg('');
    }, 0);

    return () => {
      window.clearTimeout(timer);
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [isOpen]);

  const { parsedSystem, parsedUser } = useMemo(() => {
    const sysMatch = resultText.match(/### SYSTEM PROMPT\n([\s\S]*?)(?:### USER PROMPT|$)/i);
    const userMatch = resultText.match(/### USER PROMPT\n([\s\S]*)/i);

    return {
      parsedSystem: sysMatch?.[1]?.trim() || '',
      parsedUser: userMatch?.[1]?.trim() || '',
    };
  }, [resultText]);

  const handleOptimize = async () => {
    if (!apiKey) {
      setErrorMsg(t.apiKeyMissing);
      setStatus('error');
      return;
    }

    setStatus('optimizing');
    setResultText('');
    setErrorMsg('');

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const expertPrompt = `You are an elite AI Prompt Engineer. Your task is to rewrite the user's draft prompt to be extremely effective for LLMs.
Follow these rules:
1. Assign a clear, professional role in the system prompt.
2. Ensure instructions are step-by-step and unambiguous.
3. Keep ALL dynamic {{variables}} exactly as they are in the user prompt.
4. If the task is complex, instruct the AI to use Chain-of-Thought reasoning.

You MUST format your output EXACTLY as follows, using these specific markdown headings:
### SYSTEM PROMPT
<your optimized system prompt here>

### USER PROMPT
<your optimized user prompt here>
`;

    const draftMessage = `Here is my draft prompt. Please optimize it.
${currentSystemPrompt ? `CURRENT SYSTEM PROMPT:\n${currentSystemPrompt}\n` : ''}
CURRENT USER PROMPT:
${currentContent}`;

    try {
      const cleanBaseUrl = apiBaseUrl.trim().replace(/\/+$/, '');
      const cleanApiKey = apiKey.trim();

      const response = await fetch(`${cleanBaseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanApiKey}`
        },
        body: JSON.stringify({
          model: defaultModel || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: expertPrompt },
            { role: 'user', content: draftMessage }
          ],
          temperature: 0.4,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(await readChatError(response));
      }

      await readChatCompletionStream({
        response,
        onContent: (text) => {
          if (!controller.signal.aborted) {
            setResultText(prev => prev + text);
          }
        },
      });
      if (controller.signal.aborted) return;
      setStatus('success');
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setStatus('error');
      setErrorMsg(getErrorMessage(err));
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-optimizer-title"
        className="bg-background border border-border w-[800px] h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-panel/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 id="prompt-optimizer-title" className="text-sm font-semibold">{t.optimizationTitle}</h2>
              <p className="text-xs text-gray-500">{t.optimizationDesc}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-foreground transition-colors p-1"
            title={t.cancel}
            aria-label={t.cancel}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col min-h-0">
          {status === 'idle' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6">
                <Sparkles size={32} />
              </div>
              <h3 className="text-lg font-medium mb-2">{t.readyToOptimize}</h3>
              <p className="text-sm text-gray-500 max-w-sm mb-8">
                {t.optimizationReadyDesc}
              </p>
              <button 
                onClick={handleOptimize}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2"
              >
                <Sparkles size={16} />
                {t.startOptimization}
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-6 min-h-0 bg-panel/10 gap-4">
              
              <div className="flex-1 flex flex-col min-h-0 border border-indigo-500/20 rounded-lg overflow-hidden bg-background">
                <div className="px-3 py-2 bg-indigo-500/5 border-b border-indigo-500/10 text-xs font-semibold text-indigo-400 tracking-wider">
                  OPTIMIZED SYSTEM PROMPT
                </div>
                <div className="flex-1 overflow-y-auto">
                  <SimpleEditor
                    value={parsedSystem || (status === 'optimizing' && !parsedSystem ? '...' : '')}
                    onValueChange={() => {}}
                    highlight={code => code}
                    padding={16}
                    className="text-sm font-mono text-gray-300 min-h-full opacity-80"
                    textareaClassName="focus:outline-none cursor-default"
                    disabled
                  />
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0 border border-indigo-500/20 rounded-lg overflow-hidden bg-background">
                <div className="px-3 py-2 bg-indigo-500/5 border-b border-indigo-500/10 text-xs font-semibold text-indigo-400 tracking-wider">
                  OPTIMIZED USER PROMPT
                </div>
                <div className="flex-1 overflow-y-auto">
                  <SimpleEditor
                    value={parsedUser || (status === 'optimizing' && !parsedUser ? '...' : '')}
                    onValueChange={() => {}}
                    highlight={code => code}
                    padding={16}
                    className="text-sm font-mono text-gray-300 min-h-full opacity-80"
                    textareaClassName="focus:outline-none cursor-default"
                    disabled
                  />
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        {status !== 'idle' && (
          <div className="px-6 py-4 border-t border-border bg-panel/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              {status === 'optimizing' && (
                <>
                  <Loader2 size={16} className="text-indigo-400 animate-spin" />
                  <span className="text-sm text-gray-400">{t.optimizing}</span>
                </>
              )}
              {status === 'error' && (
                <span className="text-sm text-red-400">{errorMsg}</span>
              )}
              {status === 'success' && (
                <span className="text-sm text-emerald-400 flex items-center gap-1">
                  <Check size={14} /> {t.optimizationComplete}
                </span>
              )}
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-foreground transition-colors"
              >
                {t.cancel}
              </button>
              <button 
                onClick={() => {
                  if (parsedSystem || parsedUser) {
                    onApply(parsedSystem, parsedUser);
                    onClose();
                  }
                }}
                disabled={status === 'optimizing' || (!parsedSystem && !parsedUser)}
                className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {t.applyOptimization}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
