'use client';

import React, { useState, useEffect } from 'react';
import { MermaidRenderer } from '../components/MermaidRenderer';
import { ChatPanel } from '../components/ChatPanel';
import { CodeEditor } from '../components/CodeEditor';
import { GalleryModal } from '../components/GalleryModal';
import { GeminiService } from '../services/geminiService';
import { ChatMessage, ExampleTemplate, DiagramType, ChatAttachment } from '../types';
import { GALLERY_EXAMPLES } from '../constants';
import { 
  SunIcon,
  MoonIcon,
  ChevronDownIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

const Page = () => {
  // State
  const [mermaidCode, setMermaidCode] = useState<string>(GALLERY_EXAMPLES[0].code);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'code'>('chat');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);

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
          type: 'code'
        };
        setChatHistory(prev => [...prev, aiResponse]);
      } else {
        // It's a conversational message (question or chat)
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: response.content,
          type: 'message'
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
    const svgElement = document.querySelector('#mermaid-chart-container svg');
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

  const downloadPNG = () => {
    const svgElement = document.querySelector('#mermaid-chart-container svg');
    if (svgElement) {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        const scaleFactor = 3;
        canvas.width = img.width * scaleFactor;
        canvas.height = img.height * scaleFactor;
        
        const isDark = document.documentElement.classList.contains('dark');
        ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `mermaid-diagram-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }, 'image/png');
      };
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
    } else {
      alert("没有可下载的图表渲染内容。");
    }
  };

  const downloadJPG = () => {
    const svgElement = document.querySelector('#mermaid-chart-container svg');
    if (svgElement) {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        const scaleFactor = 3;
        canvas.width = img.width * scaleFactor;
        canvas.height = img.height * scaleFactor;
        
        const isDark = document.documentElement.classList.contains('dark');
        ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `mermaid-diagram-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }, 'image/jpeg', 0.9);
      };
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
    } else {
      alert("没有可下载的图表渲染内容。");
    }
  };

  const downloadPDF = () => {
    const svgElement = document.querySelector('#mermaid-chart-container svg');
    if (svgElement) {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        const scaleFactor = 3;
        canvas.width = img.width * scaleFactor;
        canvas.height = img.height * scaleFactor;
        
        const isDark = document.documentElement.classList.contains('dark');
        ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => {
              const imgData = reader.result as string;
              
              const { jsPDF } = require('jspdf');
              const pdf = new jsPDF({
                orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
                unit: 'mm',
                format: 'a4'
              });
              
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = pdf.internal.pageSize.getHeight();
              const imgRatio = canvas.width / canvas.height;
              const pdfRatio = pdfWidth / pdfHeight;
              
              let imgWidth, imgHeight;
              if (imgRatio > pdfRatio) {
                imgWidth = pdfWidth - 20;
                imgHeight = imgWidth / imgRatio;
              } else {
                imgHeight = pdfHeight - 20;
                imgWidth = imgHeight * imgRatio;
              }
              
              const x = (pdfWidth - imgWidth) / 2;
              const y = (pdfHeight - imgHeight) / 2;
              
              pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
              pdf.save(`mermaid-diagram-${Date.now()}.pdf`);
            };
            reader.readAsDataURL(blob);
          }
        }, 'image/png');
      };
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
    } else {
      alert("没有可下载的图表渲染内容。");
    }
  };

  const downloadCode = () => {
    const blob = new Blob([mermaidCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mermaid-diagram-${Date.now()}.mmd`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:bg-gradient-to-br from-dark-950 to-dark-900 text-slate-900 dark:text-slate-100 font-sans relative transition-colors duration-300">
      {/* Navbar */}
      <header className="h-16 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 z-30 relative transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-xl shadow-glow shadow-primary-500/30">M</div>
          <h1 className="font-bold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-accent-500 dark:from-primary-400 dark:to-accent-400">Mermaid AI Architect</h1>
        </div>
        
        <div className="flex items-center gap-3">
            <a 
              href="https://github.com/logorz/Mermaid-AI-Architect"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 text-slate-500 hover:text-primary-500 dark:text-slate-400 dark:hover:text-primary-400 rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/80 backdrop-blur-sm transition-all duration-300"
              title="GitHub"
            >
              <ArrowTopRightOnSquareIcon className="w-5 h-5" />
            </a>
            
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 text-slate-500 hover:text-primary-500 dark:text-slate-400 dark:hover:text-primary-400 rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/80 backdrop-blur-sm transition-all duration-300"
              title={isDarkMode ? "切换到日间模式" : "切换到夜间模式"}
            >
              {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>

            <button 
              onClick={() => setIsGalleryOpen(true)}
              className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-lg shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-300"
            >
              <span>📊</span>
              图表库
            </button>
            
            <div className="h-6 w-px bg-slate-200/50 dark:bg-slate-700/50 mx-2 hidden md:block"></div>
            
            <button onClick={copyToClipboard} className="p-2.5 text-slate-500 hover:text-primary-500 dark:text-slate-400 dark:hover:text-primary-400 rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/80 backdrop-blur-sm transition-all duration-300" title="复制 Mermaid 代码">
              <span>📋</span>
            </button>
            <div className="relative">
              <button 
                onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                className="p-2.5 text-slate-500 hover:text-primary-500 dark:text-slate-400 dark:hover:text-primary-400 rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/80 backdrop-blur-sm transition-all duration-300 flex items-center gap-1"
                title="下载图表"
              >
                <span>📥</span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${isDownloadMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDownloadMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    <button 
                      onClick={() => { downloadSVG(); setIsDownloadMenuOpen(false); }}
                      className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 w-full text-left"
                    >
                      下载 SVG
                    </button>
                    <button 
                      onClick={() => { downloadPNG(); setIsDownloadMenuOpen(false); }}
                      className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 w-full text-left"
                    >
                      下载 PNG
                    </button>
                    <button 
                      onClick={() => { downloadJPG(); setIsDownloadMenuOpen(false); }}
                      className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 w-full text-left"
                    >
                      下载 JPG
                    </button>
                    <button 
                      onClick={() => { downloadPDF(); setIsDownloadMenuOpen(false); }}
                      className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 w-full text-left"
                    >
                      下载 PDF
                    </button>
                    <button 
                      onClick={() => { downloadCode(); setIsDownloadMenuOpen(false); }}
                      className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 w-full text-left"
                    >
                      下载 Mermaid 代码
                    </button>
                  </div>
                </div>
              )}
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden z-0">
        
        {/* Left Panel: Controls */}
        <div className="w-full md:w-[480px] flex flex-col border-r border-slate-200/50 dark:border-slate-800/50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 transition-all duration-300 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200/50 dark:border-slate-800/50">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-all ${activeTab === 'chat' ? 'border-primary-500 text-primary-500 dark:text-primary-400 bg-slate-50/80 dark:bg-slate-800/80' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <span>💬</span>
              AI 助手
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-all ${activeTab === 'code' ? 'border-primary-500 text-primary-500 dark:text-primary-400 bg-slate-50/80 dark:bg-slate-800/80' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <span>📝</span>
              代码编辑
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 relative">
            {activeTab === 'chat' ? (
              <ChatPanel 
                history={chatHistory} 
                onSendMessage={handleSendMessage} 
                isLoading={isProcessing} 
                onOptimizeText={async (text) => {
                  try {
                    const response = await GeminiService.optimizePrompt(text);
                    return response.content;
                  } catch (error) {
                    console.error("AI 优化错误:", error);
                    return text;
                  }
                }}
              />
            ) : (
              <CodeEditor code={mermaidCode} onChange={setMermaidCode} />
            )}
          </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="flex-1 bg-gradient-to-br from-slate-100 to-slate-200 dark:bg-gradient-to-br from-dark-900 to-dark-950 relative overflow-hidden flex flex-col transition-colors duration-300">
          <div className="flex-1 relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05),transparent_70%)]"></div>
            <MermaidRenderer 
              code={mermaidCode} 
              onFixError={handleFixError}
              isFixing={isFixing}
              onUpdateCode={setMermaidCode} // Pass this for color updates
              onRequestChange={(code) => {
                // 切换到聊天标签页，并添加一个新的消息，提示用户可以针对当前流程图提出修改需求
                setActiveTab('chat');
                setChatHistory(prev => [...prev, {
                  id: Date.now().toString(),
                  role: 'model',
                  content: `🔄 当前正在编辑的流程图已加载。请告诉我您希望如何修改这个流程图，我会根据您的需求进行调整。`
                }]);
              }}
            />
          </div>
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

export default Page;
