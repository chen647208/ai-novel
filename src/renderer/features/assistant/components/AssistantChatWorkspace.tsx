/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { templateDisplayName } from '@/i18n';
import type { CardPromptTemplate, KnowledgeItem } from '../../../../shared/types';
import type { AssistantWindowSize, ChatMessage } from '../types';
import { AlertCircle, BookOpen, Calculator, Clock, Cpu, FileText, Flag, Keyboard, Landmark, LoaderCircle, MapPin, MessagesSquare, Paperclip, Reply, Send, Settings2, Square, User, X, Zap } from 'lucide-react';


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
  onStopGeneration: () => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  cardPromptTemplates: CardPromptTemplate[];
  selectedCardTemplateId: string | null;
  setSelectedCardTemplateId: React.Dispatch<React.SetStateAction<string | null>>;
  isLocked: boolean;
  size: AssistantWindowSize;
  setSize: React.Dispatch<React.SetStateAction<AssistantWindowSize>>;
}

// cmd 前缀是数据（aiCardCommandService 对中英别名都接受），故按语言在渲染期取用；
// filterTemplatesByInput 同时匹配两语言前缀。
const quickCommands = [
  { zh: '/角色', en: '/character', icon: User, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200', category: 'card-character' },
  { zh: '/地点', en: '/location', icon: MapPin, color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200', category: 'card-location' },
  { zh: '/势力', en: '/faction', icon: Flag, color: 'bg-amber-100 text-amber-700 hover:bg-amber-200', category: 'card-faction' },
  { zh: '/时间线', en: '/timeline', icon: Clock, color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200', category: 'card-timeline' },
  { zh: '/规则', en: '/rule', icon: Settings2, color: 'bg-rose-100 text-rose-700 hover:bg-rose-200', category: 'card-rule' },
  { zh: '/魔法体系', en: '/magic', icon: Zap, color: 'bg-purple-100 text-purple-700 hover:bg-purple-200', category: 'card-magic' },
  { zh: '/科技水平', en: '/technology', icon: Cpu, color: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200', category: 'card-tech' },
  { zh: '/历史背景', en: '/history', icon: Landmark, color: 'bg-stone-100 text-stone-700 hover:bg-stone-200', category: 'card-history' },
] as const;

const filterTemplatesByInput = (templates: CardPromptTemplate[], input: string) => {
  return templates.filter((template) =>
    input.includes('/角色') || input.includes('/character') ? template.category === 'card-character'
      : input.includes('/地点') || input.includes('/location') ? template.category === 'card-location'
      : input.includes('/势力') || input.includes('/faction') ? template.category === 'card-faction'
      : input.includes('/时间线') || input.includes('/事件') || input.includes('/timeline') || input.includes('/event') ? template.category === 'card-timeline'
      : input.includes('/规则') || input.includes('/体系') || input.includes('/rule') ? template.category === 'card-rule'
      : input.includes('/魔法') || input.includes('/修炼') || input.includes('/magic') ? template.category === 'card-magic'
      : input.includes('/科技') || input.includes('/tech') || input.includes('/technology') ? template.category === 'card-tech'
      : input.includes('/历史') || input.includes('/history') ? template.category === 'card-history'
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
  onStopGeneration,
  handleFileUpload,
  cardPromptTemplates,
  selectedCardTemplateId,
  setSelectedCardTemplateId,
  isLocked,
  size,
  setSize,
}) => {
  const { t, i18n } = useTranslation('assistant');
  return (
    <>
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 custom-scrollbar"
        style={{ display: (contextPanelOpen || editPanelOpen) ? 'none' : 'block' }}
      >
        {messages.length === 0 && (
          <div className="text-center mt-20 text-gray-300">
            <MessagesSquare className="size-10 mb-3 opacity-20" />
            <p className="text-xs">{t('chat.empty')}</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-100 text-gray-700 shadow-sm rounded-bl-none'}`}>
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mb-2 space-y-1">
                  {msg.attachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs bg-black/10 px-2 py-1 rounded">
                      {file.type === 'context' ? <BookOpen className="size-4" /> : <Paperclip className="size-4" />}
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
                      <Cpu className="size-4" />
                      <span>{t('chat.modelPrefix')}{msg.model}</span>
                    </div>
                  )}
                  {msg.tokens && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1"><Keyboard className="size-4" /><span>{t('chat.inputPrefix')}{msg.tokens.prompt}</span></div>
                      <div className="flex items-center gap-1"><Reply className="size-4" /><span>{t('chat.outputPrefix')}{msg.tokens.completion}</span></div>
                      <div className="flex items-center gap-1"><Calculator className="size-4" /><span>{t('chat.totalPrefix')}{msg.tokens.total}</span></div>
                    </div>
                  )}
                  {msg.finishReason && (
                      <div className="flex items-center gap-1"><Flag className="size-4" /><span>{t('chat.finishReasonPrefix')}{msg.finishReason}</span></div>
                  )}
                  {msg.error && (
                      <div className="flex items-center gap-1 text-red-500"><AlertCircle className="size-4" /><span>{t('chat.errorPrefix')}{msg.error}</span></div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && !streamingMessageId && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none p-3 shadow-sm">
              <LoaderCircle className="size-3.5 animate-spin text-blue-500" />
            </div>
          </div>
        )}
      </div>

      {!contextPanelOpen && pendingFiles.length > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex gap-2 overflow-x-auto custom-scrollbar shrink-0">
          {pendingFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-1 bg-white border border-blue-200 px-2 py-1 rounded-lg text-[10px] text-blue-700 whitespace-nowrap">
              <FileText className="size-4" />
              <span className="max-w-[80px] truncate">{file.name}</span>
              <button onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== index))} className="hover:text-red-500 ml-1"><X className="size-4" /></button>
            </div>
          ))}
        </div>
      )}

      {!contextPanelOpen && (
        <div className="p-3 bg-white border-t border-gray-100 shrink-0">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="text-[10px] text-gray-400 py-1">{t('chat.quickCreateLabel')}</span>
            {quickCommands.map((item) => {
              const cmd = `${i18n.language === 'en' ? item.en : item.zh} `;
              return (
                <button
                  key={cmd}
                  onClick={() => {
                    setInput(cmd);
                    const defaultTemplate = cardPromptTemplates.find((template) => template.category === item.category);
                    if (defaultTemplate) {
                      setSelectedCardTemplateId(defaultTemplate.id);
                    }
                  }}
                  className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${item.color}`}
                  title={t('chat.commandTitle', { cmd: cmd.trim() })}
                >
                  <item.icon className="mr-1 inline size-3 align-text-bottom" />
                  {cmd.trim()}
                </button>
              );
            })}
          </div>

          {input.startsWith('/') && cardPromptTemplates.length > 0 && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-[10px] text-gray-400">{t('chat.templateLabel')}</span>
              <select
                value={selectedCardTemplateId || ''}
                onChange={(event) => setSelectedCardTemplateId(event.target.value || null)}
                className="flex-1 text-[10px] bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500"
              >
                <option value="">{t('chat.defaultTemplateOption')}</option>
                {filterTemplatesByInput(cardPromptTemplates, input).map((template) => (
                  <option key={template.id} value={template.id}>{templateDisplayName(template)}</option>
                ))}
              </select>
              {selectedCardTemplateId && (
                <button onClick={() => setSelectedCardTemplateId(null)} className="text-[10px] text-gray-400 hover:text-red-500" title={t('chat.resetTemplateTitle')}>
                  <X className="size-4" />
                </button>
              )}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <label className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl cursor-pointer transition-colors">
              <Paperclip className="size-5" />
              <input type="file" multiple className="hidden" onChange={handleFileUpload} accept=".txt,.md,.json,.js,.ts,.csv" />
            </label>
            <textarea
              className="flex-1 max-h-32 min-h-[40px] bg-gray-50 border-none rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none resize-none custom-scrollbar"
              placeholder={t('chat.inputPlaceholder')}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            {isLoading && streamingMessageId ? (
              <button
                onClick={onStopGeneration}
                title={t('chat.stopTitle')}
                className="p-2.5 rounded-xl text-white transition-all shadow-lg bg-red-500 hover:bg-red-600 active:scale-95 shadow-red-200"
              >
                <Square className="size-4" />
              </button>
            ) : (
              <button
                onClick={handleSendMessage}
                disabled={isLoading || (!input.trim() && pendingFiles.length === 0)}
                className={`p-2.5 rounded-xl text-white transition-all shadow-lg ${isLoading || (!input.trim() && pendingFiles.length === 0) ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-200'}`}
              >
                <Send className="size-4" />
              </button>
            )}
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
        title={isLocked ? t('chat.resizeLockedTitle') : t('chat.resizeTitle')}
      />
    </>
  );
};

export default AssistantChatWorkspace;

