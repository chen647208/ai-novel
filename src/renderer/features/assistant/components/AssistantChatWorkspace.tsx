/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { templateDisplayName } from '@/i18n';
import type { CardPromptTemplate, KnowledgeItem } from '../../../../shared/types';
import type { ChatMessage } from '../types';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { MarkdownView } from '@/shared/ui/Markdown';
import { cn } from '@/shared/utils/cn';
import { AlertCircle, BookOpen, Calculator, Clock, Cpu, FileText, Flag, Keyboard, Landmark, MapPin, MessagesSquare, Paperclip, Reply, Send, Settings2, Square, User, X, Zap } from 'lucide-react';
import { Spinner } from '@/shared/ui/Spinner';


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
}

// cmd 前缀是数据（aiCardCommandService 对中英别名都接受），故按语言在渲染期取用；
// filterTemplatesByInput 同时匹配两语言前缀。
const quickCommands = [
  { zh: '/角色', en: '/character', icon: User, category: 'card-character' },
  { zh: '/地点', en: '/location', icon: MapPin, category: 'card-location' },
  { zh: '/势力', en: '/faction', icon: Flag, category: 'card-faction' },
  { zh: '/时间线', en: '/timeline', icon: Clock, category: 'card-timeline' },
  { zh: '/规则', en: '/rule', icon: Settings2, category: 'card-rule' },
  { zh: '/魔法体系', en: '/magic', icon: Zap, category: 'card-magic' },
  { zh: '/科技水平', en: '/technology', icon: Cpu, category: 'card-tech' },
  { zh: '/历史背景', en: '/history', icon: Landmark, category: 'card-history' },
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
}) => {
  const { t, i18n } = useTranslation('assistant');
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // 输入框自增高：随内容（含两行占位符）撑开，上限 max-h-32。
  React.useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input]);
  return (
    <>
      <div
        ref={chatContainerRef}
        className="custom-scrollbar flex-1 space-y-4 overflow-y-auto bg-muted/20 p-4"
        style={{ display: (contextPanelOpen || editPanelOpen) ? 'none' : 'block' }}
      >
        {messages.length === 0 && (
          <div className="mt-20 text-center text-muted-foreground">
            <MessagesSquare className="mx-auto mb-3 size-10 opacity-40" />
            <p className="mb-3 text-xs">{t('chat.empty')}</p>
            <div className="mx-auto flex max-w-[260px] flex-col gap-1.5">
              {[t('chat.tryAsk1'), t('chat.tryAsk2'), t('chat.tryAsk3')].map((example) => (
                <Button
                  key={example}
                  variant="outline"
                  size="sm"
                  className="h-auto whitespace-normal py-1.5 text-xs font-normal"
                  onClick={() => setInput(example)}
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[85%] rounded-xl p-3 text-sm leading-relaxed',
              msg.role === 'user' && 'whitespace-pre-wrap',
              msg.role === 'user'
                ? 'rounded-br-sm bg-primary text-primary-foreground'
                : 'rounded-bl-sm border border-border bg-card text-foreground shadow-sm'
            )}>
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mb-2 space-y-1">
                  {msg.attachments.map((file, index) => (
                    <div key={index} className={cn('flex items-center gap-2 rounded px-2 py-1 text-xs', msg.role === 'user' ? 'bg-black/10' : 'bg-muted/60')}>
                      {file.type === 'context' ? <BookOpen className="size-4" /> : <Paperclip className="size-4" />}
                      <span className="max-w-[150px] truncate">{file.name}</span>
                    </div>
                  ))}
                  <hr className={cn('my-2 border-white/20', msg.role !== 'user' && 'border-border')} />
                </div>
              )}
              <div className="relative">
                {msg.role === 'user'
                  ? msg.content
                  : <MarkdownView content={msg.content} className="text-sm [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0" />}
                {msg.isStreaming && <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-primary align-middle"></span>}
              </div>
              {(msg.tokens || msg.model || msg.finishReason) && (
                <div className="mt-2 space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
                  {msg.model && (
                    <div className="flex items-center gap-1">
                      <Cpu className="size-4" />
                      <span>{t('chat.modelPrefix')}{msg.model}</span>
                    </div>
                  )}
                  {msg.tokens && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1"><Keyboard className="size-4" /><span className="tabular-nums">{t('chat.inputPrefix')}{msg.tokens.prompt}</span></div>
                      <div className="flex items-center gap-1"><Reply className="size-4" /><span className="tabular-nums">{t('chat.outputPrefix')}{msg.tokens.completion}</span></div>
                      <div className="flex items-center gap-1"><Calculator className="size-4" /><span className="tabular-nums">{t('chat.totalPrefix')}{msg.tokens.total}</span></div>
                    </div>
                  )}
                  {msg.finishReason && (
                      <div className="flex items-center gap-1"><Flag className="size-4" /><span>{t('chat.finishReasonPrefix')}{msg.finishReason}</span></div>
                  )}
                  {msg.error && (
                      <div className="flex items-center gap-1 text-destructive"><AlertCircle className="size-4" /><span>{t('chat.errorPrefix')}{msg.error}</span></div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && !streamingMessageId && (
          <div className="flex justify-start">
            <div className="rounded-xl rounded-bl-sm border border-border bg-card p-3 shadow-sm">
              <Spinner className="size-3.5 text-primary" />
            </div>
          </div>
        )}
      </div>

      {pendingFiles.length > 0 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-border bg-primary/5 px-4 py-2 custom-scrollbar">
          {pendingFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-1 whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-2xs text-foreground">
              <FileText className="size-3.5" />
              <span className="max-w-[80px] truncate">{file.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== index))}
                className="ml-1 size-5 text-muted-foreground hover:text-destructive"
              ><X className="size-3.5" /></Button>
            </div>
          ))}
        </div>
      )}

      {/* 输入区常驻：上下文面板打开时只收起快捷命令与模板行，输入框不消失 */}
      {
        <div className="shrink-0 border-t border-border bg-card p-3">
          {!contextPanelOpen && (
          <>
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="py-1 text-2xs uppercase tracking-wider text-muted-foreground">{t('chat.quickCreateLabel')}</span>
            {quickCommands.map((item) => {
              const cmd = `${i18n.language === 'en' ? item.en : item.zh} `;
              return (
                <Button
                  key={cmd}
                  variant="outline"
                  onClick={() => {
                    setInput(cmd);
                    const defaultTemplate = cardPromptTemplates.find((template) => template.category === item.category);
                    if (defaultTemplate) {
                      setSelectedCardTemplateId(defaultTemplate.id);
                    }
                  }}
                  className="h-auto gap-1 px-2 py-1 text-2xs font-normal text-muted-foreground hover:border-primary/40 hover:text-primary"
                  title={t('chat.commandTitle', { cmd: cmd.trim() })}
                >
                  <item.icon className="size-3" />
                  {cmd.trim()}
                </Button>
              );
            })}
          </div>

          {input.startsWith('/') && cardPromptTemplates.length > 0 && (
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className="text-2xs uppercase tracking-wider text-muted-foreground">{t('chat.templateLabel')}</span>
              <Select
                className="h-7 flex-1 text-xs"
                value={selectedCardTemplateId || ''}
                onChange={(event) => setSelectedCardTemplateId(event.target.value || null)}
              >
                <option value="">{t('chat.defaultTemplateOption')}</option>
                {filterTemplatesByInput(cardPromptTemplates, input).map((template) => (
                  <option key={template.id} value={template.id}>{templateDisplayName(template)}</option>
                ))}
              </Select>
              {selectedCardTemplateId && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedCardTemplateId(null)}
                  className="size-7 text-muted-foreground hover:text-destructive"
                  title={t('chat.resetTemplateTitle')}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          )}
          </>
          )}

          <div className="flex items-end gap-2">
            <label className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <Paperclip className="size-5" />
              <input type="file" multiple className="hidden" onChange={handleFileUpload} accept=".txt,.md,.json,.js,.ts,.csv" />
            </label>
            <Textarea
              ref={inputRef}
              className="max-h-32 min-h-[58px] flex-1"
              rows={2}
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
              <Button
                variant="outline"
                size="icon"
                onClick={onStopGeneration}
                title={t('chat.stopTitle')}
                className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Square className="size-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={isLoading || (!input.trim() && pendingFiles.length === 0)}
                title={t('chat.sendTitle')}
                className="shrink-0"
              >
                <Send className="size-4" />
              </Button>
            )}
          </div>
        </div>
      }

    </>
  );
};

export default AssistantChatWorkspace;
