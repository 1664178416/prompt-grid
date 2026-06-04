import Sidebar from '@/components/sidebar/Sidebar';
import PromptList from '@/components/prompt-list/PromptList';
import Editor from '@/components/editor/Editor';

export default function Home() {
  return (
    <main className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <Sidebar />
      <PromptList />
      <Editor />
    </main>
  );
}
