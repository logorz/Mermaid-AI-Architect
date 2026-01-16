import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MermaidRenderer } from './components/MermaidRenderer';
import { ChatPanel } from './components/ChatPanel';
import { CodeEditor } from './components/CodeEditor';
import { GalleryModal } from './components/GalleryModal';
import { GeminiService } from './services/geminiService';
import { ChatMessage, ExampleTemplate, DiagramType, ChatAttachment } from './types';
import { GALLERY_EXAMPLES } from './constants';
import { 
  CodeBracketIcon, 
  ChatBubbleLeftRightIcon, 
  ArrowDownTrayIcon,
  ClipboardDocumentCheckIcon,
  Squares2X2Icon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';

const App = () => {
  // State
  const [mermaidCode, setMermaidCode] = useState<string>(GALLERY_EXAMPLES[0].code);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'code'>('chat');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Theme Toggle Effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Handlers
  const handleSendMessage = async (text: string, attachment?: ChatAttachment, type: DiagramType = 'auto') => {
    setIsProcessing(true);
    
    // Construct new user message
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      attachment: attachment,
    };
    
    // Optimistic UI update: add user message immediately
    const updatedHistory = [...chatHistory, newMessage];
    setChatHistory(updatedHistory);

    try {
      // Call service with full history
      const response = await GeminiService.generateFromHistory(updatedHistory, mermaidCode, type);

      if (response.type === 'code') {
        // It's a diagram update
        setMermaidCode(response.content);
        
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: `✅ 已根据您的要求生成/更新了图表。\n如果细节不准确，您可以继续告诉我。`,
        };
        setChatHistory(prev => [...prev, aiResponse]);
      } else {
        // It's a conversational message (question or chat)
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: response.content,
        };
        setChatHistory(prev => [...prev, aiResponse]);
      }

    } catch (err) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: "抱歉，处理您的请求时遇到错误，请重试。",
        isError: true
      };
      setChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFixError = async (code: string, error: string) => {
    setIsFixing(true);
    try {
      const result = await GeminiService.fixDiagram(code, error);
      setMermaidCode(result.code);
      
      const fixMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        content: `🔧 已修复语法错误。\n\n原因: ${result.explanation}`
      };
      setChatHistory(prev => [...prev, fixMessage]);
      if (activeTab !== 'chat') setActiveTab('chat');
      
    } catch (err) {
      alert("无法自动修复，请检查代码。");
    } finally {
      setIsFixing(false);
    }
  };

  const loadExample = (template: ExampleTemplate) => {
    setMermaidCode(template.code);
    // Reset history when loading a template to avoid context confusion? 
    // Usually better to just add a system note, but here strictly adding a message is fine.
    setChatHistory(prev => [...prev, {
      id: Date.now().toString(),
      role: 'model',
      content: `已加载模板: ${template.name}`
    }]);
    setIsGalleryOpen(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(mermaidCode);
    alert("代码已复制到剪贴板！");
  };

  const downloadSVG = () => {
    const svgElement = document.querySelector('main #root svg') || document.querySelector('div[dangerouslySetInnerHTML] > svg');
    if (svgElement) {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mermaid-diagram-${Date.now()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert("没有可下载的图表渲染内容。");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans relative transition-colors duration-300">
      {/* Navbar */}
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 shadow-sm z-30 relative transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-500/20">M</div>
          <h1 className="font-bold text-lg tracking-tight text-slate-800 dark:text-slate-100">Mermaid 绘图师</h1>
        </div>
        
        <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-yellow-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mr-2"
              title={isDarkMode ? "切换到日间模式" : "切换到夜间模式"}
            >
              {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>

            <button 
              onClick={() => setIsGalleryOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 border border-brand-200 dark:border-brand-500/30 rounded transition-colors mr-2"
            >
              <Squares2X2Icon className="w-4 h-4" />
              图表库
            </button>
            
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>
            
            <button onClick={copyToClipboard} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="复制 Mermaid 代码">
              <ClipboardDocumentCheckIcon className="w-5 h-5" />
            </button>
            <button onClick={downloadSVG} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="下载 SVG">
              <ArrowDownTrayIcon className="w-5 h-5" />
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden z-0">
        
        {/* Left Panel: Controls */}
        <div className="w-full md:w-[450px] flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 shadow-xl transition-colors duration-300">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'chat' ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-slate-50 dark:bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <ChatBubbleLeftRightIcon className="w-4 h-4" />
              AI 助手
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'code' ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-slate-50 dark:bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <CodeBracketIcon className="w-4 h-4" />
              代码编辑
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden relative">
            {activeTab === 'chat' ? (
              <ChatPanel 
                history={chatHistory} 
                onSendMessage={handleSendMessage} 
                isLoading={isProcessing} 
              />
            ) : (
              <CodeEditor code={mermaidCode} onChange={setMermaidCode} />
            )}
          </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex flex-col transition-colors duration-300">
          <MermaidRenderer 
            code={mermaidCode} 
            onFixError={handleFixError}
            isFixing={isFixing}
            onUpdateCode={setMermaidCode} // Pass this for color updates
          />
        </div>

      </main>

      {/* Gallery Modal - Rendered last to stay on top */}
      <GalleryModal 
        isOpen={isGalleryOpen} 
        onClose={() => setIsGalleryOpen(false)} 
        onSelect={loadExample} 
      />
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
