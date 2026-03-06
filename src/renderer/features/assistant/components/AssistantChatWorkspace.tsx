import React from 'react';
import type { CardPromptTemplate, KnowledgeItem } from '../../../../shared/types';
import type { AssistantWindowSize, ChatMessage } from '../types';

interface AssistantChatWorkspaceProps {
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  contextPanelOpen: boolean;
  editPanelOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  streamingMessageId: string | null;
  pendingFiles: KnowledgeItem[];
  setPendingFiles: React.Dispatch<React.SetStateAction<KnowledgeItem[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  handleSendMessage: () => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  cardPromptTemplates: CardPromptTemplate[];
  selectedCardTemplateId: string | null;
  setSelectedCardTemplateId: React.Dispatch<React.SetStateAction<string | null>>;
  isLocked: boolean;
  size: AssistantWindowSize;
  setSize: React.Dispatch<React.SetStateAction<AssistantWindowSize>>;
}

const quickCommands = [
  { cmd: '/角色 ', icon: 'fa-user', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200', category: 'card-character' },
  { cmd: '/地点 ', icon: 'fa-map-marker-alt', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200', category: 'card-location' },
  { cmd: '/势力 ', icon: 'fa-flag', color: 'bg-amber-100 text-amber-700 hover:bg-amber-200', category: 'card-faction' },
  { cmd: '/时间线 ', icon: 'fa-clock', color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200', category: 'card-timeline' },
  { cmd: '/规则 ', icon: 'fa-cogs', color: 'bg-rose-100 text-rose-700 hover:bg-rose-200', category: 'card-rule' },
  { cmd: '/魔法体系 ', icon: 'fa-bolt', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200', category: 'card-magic' },
  { cmd: '/科技水平 ', icon: 'fa-microchip', color: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200', category: 'card-tech' },
  { cmd: '/历史背景 ', icon: 'fa-landmark', color: 'bg-stone-100 text-stone-700 hover:bg-stone-200', category: 'card-history' },
] as const;

const filterTemplatesByInput = (templates: CardPromptTemplate[], input: string) => {
  return templates.filter((template) =>
    input.includes('/角色') ? template.category === 'card-character'
      : input.includes('/地点') ? template.category === 'card-location'
      : input.includes('/势力') ? template.category === 'card-faction'
      : input.includes('/时间线') || input.includes('/事件') ? template.category === 'card-timeline'
      : input.includes('/规则') || input.includes('/体系') ? template.category === 'card-rule'
      : input.includes('/魔法') || input.includes('/修炼') ? template.category === 'card-magic'
      : input.includes('/科技') ? template.category === 'card-tech'
      : input.includes('/历史') ? template.category === 'card-history'
      : true,
  );
};

const AssistantChatWorkspace: React.FC<AssistantChatWorkspaceProps> = ({
  chatContainerRef,
  contextPanelOpen,
  editPanelOpen,
  messages,
  isLoading,
  streamingMessageId,
  pendingFiles,
  setPendingFiles,
  input,
  setInput,
  handleSendMessage,
  handleFileUpload,
  cardPromptTemplates,
  selectedCardTemplateId,
  setSelectedCardTemplateId,
  isLocked,
  size,
  setSize,
}) => {
  return (
    <>
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 custom-scrollbar"
        style={{ display: (contextPanelOpen || editPanelOpen) ? 'none' : 'block' }}
      >
        {messages.length === 0 && (
          <div className="text-center mt-20 text-gray-300">
            <i className="fas fa-comments text-4xl mb-3 opacity-20"></i>
            <p className="text-xs">选择上下文分析，或直接对话。</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-100 text-gray-700 shadow-sm rounded-bl-none'}`}>
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mb-2 space-y-1">
                  {msg.attachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs bg-black/10 px-2 py-1 rounded">
                      <i className={`fas ${file.type === 'context' ? 'fa-book-open' : 'fa-paperclip'}`}></i>
                      <span className="truncate max-w-[150px]">{file.name}</span>
                    </div>
                  ))}
                  <hr className="border-white/20 my-2" />
                </div>
              )}
              <div className="relative">
                {msg.content}
                {msg.isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse"></span>}
              </div>
              {(msg.tokens || msg.model || msg.finishReason) && (
                <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                  {msg.model && (
                    <div className="flex items-center gap-1">
                      <i className="fas fa-microchip"></i>
                      <span>模型: {msg.model}</span>
                    </div>
                  )}
                  {msg.tokens && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1"><i className="fas fa-keyboard"></i><span>输入: {msg.tokens.prompt}</span></div>
                      <div className="flex items-center gap-1"><i className="fas fa-reply"></i><span>输出: {msg.tokens.completion}</span></div>
                      <div className="flex items-center gap-1"><i className="fas fa-calculator"></i><span>总计: {msg.tokens.total}</span></div>
                    </div>
                  )}
                  {msg.finishReason && (
                    <div className="flex items-center gap-1"><i className="fas fa-flag-checkered"></i><span>完成原因: {msg.finishReason}</span></div>
                  )}
                  {msg.error && (
                    <div className="flex items-center gap-1 text-red-500"><i className="fas fa-exclamation-circle"></i><span>错误: {msg.error}</span></div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && !streamingMessageId && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none p-3 shadow-sm">
              <i className="fas fa-circle-notch fa-spin text-blue-500 text-xs"></i>
            </div>
          </div>
        )}
      </div>

      {!contextPanelOpen && pendingFiles.length > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex gap-2 overflow-x-auto custom-scrollbar shrink-0">
          {pendingFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-1 bg-white border border-blue-200 px-2 py-1 rounded-lg text-[10px] text-blue-700 whitespace-nowrap">
              <i className="fas fa-file-alt"></i>
              <span className="max-w-[80px] truncate">{file.name}</span>
              <button onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== index))} className="hover:text-red-500 ml-1"><i className="fas fa-times"></i></button>
            </div>
          ))}
        </div>
      )}

      {!contextPanelOpen && (
        <div className="p-3 bg-white border-t border-gray-100 shrink-0">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="text-[10px] text-gray-400 py-1">快捷创建:</span>
            {quickCommands.map((item) => (
              <button
                key={item.cmd}
                onClick={() => {
                  setInput(item.cmd);
                  const defaultTemplate = cardPromptTemplates.find((template) => template.category === item.category);
                  if (defaultTemplate) {
                    setSelectedCardTemplateId(defaultTemplate.id);
                  }
                }}
                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${item.color}`}
                title={`点击快速输入 ${item.cmd}`}
              >
                <i className={`fas ${item.icon} mr-1`}></i>
                {item.cmd.trim()}
              </button>
            ))}
          </div>

          {input.startsWith('/') && cardPromptTemplates.length > 0 && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-[10px] text-gray-400">模板:</span>
              <select
                value={selectedCardTemplateId || ''}
                onChange={(event) => setSelectedCardTemplateId(event.target.value || null)}
                className="flex-1 text-[10px] bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500"
              >
                <option value="">使用默认模板</option>
                {filterTemplatesByInput(cardPromptTemplates, input).map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
              {selectedCardTemplateId && (
                <button onClick={() => setSelectedCardTemplateId(null)} className="text-[10px] text-gray-400 hover:text-red-500" title="重置为默认模板">
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <label className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl cursor-pointer transition-colors">
              <i className="fas fa-paperclip text-lg"></i>
              <input type="file" multiple className="hidden" onChange={handleFileUpload} accept=".txt,.md,.json,.js,.ts,.csv" />
            </label>
            <textarea
              className="flex-1 max-h-32 min-h-[40px] bg-gray-50 border-none rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none resize-none custom-scrollbar"
              placeholder="输入问题，或使用 /角色 /地点 /势力 等命令快速创建... (Shift+Enter 换衍)"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || (!input.trim() && pendingFiles.length === 0)}
              className={`p-2.5 rounded-xl text-white transition-all shadow-lg ${isLoading || (!input.trim() && pendingFiles.length === 0) ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-200'}`}
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      )}

      <div
        className={`absolute bottom-0 right-0 w-4 h-4 z-10 ${isLocked ? 'cursor-not-allowed' : 'cursor-se-resize'}`}
        onMouseDown={(event) => {
          event.stopPropagation();
          event.preventDefault();
          if (isLocked) return;
          const startX = event.clientX;
          const startY = event.clientY;
          const startW = size.width;
          const startH = size.height;
          const handleResize = (moveEvent: MouseEvent) => {
            setSize({
              width: Math.max(300, startW + (moveEvent.clientX - startX)),
              height: Math.max(400, startH + (moveEvent.clientY - startY)),
            });
          };
          const stopResize = () => {
            window.removeEventListener('mousemove', handleResize);
            window.removeEventListener('mouseup', stopResize);
          };
          window.addEventListener('mousemove', handleResize);
          window.addEventListener('mouseup', stopResize);
        }}
        title={isLocked ? '窗口已锁定，无法调整大小' : '拖动调整窗口大小'}
      />
    </>
  );
};

export default AssistantChatWorkspace;

