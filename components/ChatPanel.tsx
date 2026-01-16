import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, DiagramType, ChatAttachment } from '../types';
import { DIAGRAM_TYPES } from '../constants';
import { 
  PaperAirplaneIcon, 
  PhotoIcon, 
  ArrowPathIcon,
  XMarkIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline';

interface ChatPanelProps {
  history: ChatMessage[];
  onSendMessage: (text: string, attachment?: ChatAttachment, type?: DiagramType) => Promise<void>;
  isLoading: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ history, onSendMessage, isLoading }) => {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<ChatAttachment | null>(null);
  const [selectedType, setSelectedType] = useState<DiagramType>('auto');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setSelectedFile({
            content: ev.target.result as string,
            mimeType: file.type,
            fileName: file.name
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!inputText.trim() && !selectedFile) || isLoading) return;

    const text = inputText;
    const attachment = selectedFile;
    const type = selectedType;
    
    setInputText('');
    setSelectedFile(null);
    if(fileInputRef.current) fileInputRef.current.value = '';

    await onSendMessage(text, attachment || undefined, type);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send on Ctrl + Enter or Command + Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const renderAttachmentPreview = (attachment: ChatAttachment, allowRemove = false) => {
    const isImage = attachment.mimeType.startsWith('image/');
    
    return (
      <div className={`relative inline-flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 ${allowRemove ? 'mb-2' : 'mb-2'}`}>
        {isImage ? (
           <img src={attachment.content} alt="Preview" className="h-12 w-auto rounded border border-slate-300 dark:border-slate-600" />
        ) : (
           <div className="h-12 w-12 flex items-center justify-center bg-white dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 text-brand-500">
              <DocumentTextIcon className="w-8 h-8" />
           </div>
        )}
        
        <div className="flex flex-col justify-center max-w-[120px]">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate w-full" title={attachment.fileName}>
            {attachment.fileName || (isImage ? '图片' : '文件')}
          </span>
          <span className="text-[10px] text-slate-400 uppercase">{attachment.mimeType.split('/')[1]}</span>
        </div>

        {allowRemove && (
          <button 
            onClick={() => {
              setSelectedFile(null);
              if(fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="absolute -top-2 -right-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 rounded-full p-1 border border-slate-300 dark:border-slate-600 shadow-sm"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transition-colors duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
        <h2 className="text-lg font-semibold text-brand-600 dark:text-brand-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"/>
          AI 架构师
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">支持 PDF 文档解析与图片识别</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 && (
          <div className="text-center text-slate-400 dark:text-slate-500 mt-10">
            <p>暂无消息。</p>
            <p className="text-sm mt-2">试试上传一个需求 PDF 或手绘草图</p>
          </div>
        )}
        
        {history.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col max-w-[90%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
          >
            <div 
              className={`p-3 rounded-lg text-sm shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-brand-600 text-white rounded-tr-none shadow-brand-500/20' 
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-600'
              } ${msg.isError ? 'bg-red-50 dark:bg-red-900/50 border-red-200 dark:border-red-500 text-red-800 dark:text-red-100' : ''}`}
            >
              {msg.attachment && renderAttachmentPreview(msg.attachment, false)}
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-center space-x-2 text-brand-500 dark:text-brand-400 text-sm p-2 animate-pulse">
             <ArrowPathIcon className="w-4 h-4 animate-spin" />
             <span>AI 正在阅读文档并构建图表...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 transition-colors">
        {selectedFile && renderAttachmentPreview(selectedFile, true)}
        
        <form onSubmit={handleSubmit} className="relative flex flex-col gap-2">
          {/* Controls Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-[180px]">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as DiagramType)}
                className="w-full appearance-none bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 focus:outline-none focus:border-brand-500 pr-6 transition-colors"
              >
                {DIAGRAM_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2 top-1.5 w-3 h-3 text-slate-500 pointer-events-none" />
            </div>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="描述您的需求或上传文件... (Enter 换行, Ctrl+Enter 发送)"
            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 resize-none scrollbar-hide text-slate-800 dark:text-slate-200 transition-colors placeholder:text-slate-400"
            rows={selectedFile ? 2 : 3}
          />
          
          <div className="absolute right-2 bottom-2 flex items-center space-x-1">
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-lg transition-colors ${selectedFile ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              title="上传图片或 PDF"
            >
              {selectedFile ? <PaperClipIcon className="w-5 h-5" /> : <PhotoIcon className="w-5 h-5" />}
            </button>
            <button
              type="submit"
              disabled={isLoading || (!inputText && !selectedFile)}
              className="p-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-900/20"
              title="Ctrl + Enter 发送"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
