import React from 'react';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange }) => {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transition-colors duration-300">
       <div className="p-3 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">mermaid.mmd</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">自动保存</span>
      </div>
      <textarea
        className="flex-1 w-full h-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-300 font-mono text-sm p-4 focus:outline-none resize-none leading-relaxed transition-colors selection:bg-brand-200 dark:selection:bg-brand-900"
        value={code}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder="在此输入 Mermaid 代码..."
      />
    </div>
  );
};
