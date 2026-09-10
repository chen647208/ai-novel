/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * 令牌化下拉选择：基于 Radix Select 的浮层实现，替代原生 select 的系统级弹层。
 * 兼容原生 select 的数据驱动用法——子元素写 <option>/<optgroup>，事件仍走
 * onChange(e.target.value)；空字符串 value 通过哨兵值桥接（Radix 不允许空 item value）。
 */

const EMPTY_SENTINEL = '__ai_novel_empty__';

interface ParsedOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

interface ParsedEntry {
  groupLabel?: string;
  options: ParsedOption[];
}

function parseOption(child: React.ReactElement): ParsedOption {
  const p = child.props as { value?: string; children?: React.ReactNode; disabled?: boolean };
  return { value: p.value ?? '', label: p.children, disabled: p.disabled };
}

function parseChildren(children: React.ReactNode): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === 'optgroup') {
      const p = child.props as { label?: React.ReactNode; children?: React.ReactNode };
      const options: ParsedOption[] = [];
      React.Children.forEach(p.children, (opt) => {
        if (React.isValidElement(opt) && opt.type === 'option') options.push(parseOption(opt));
      });
      entries.push({ groupLabel: typeof p.label === 'string' ? p.label : undefined, options });
    } else if (child.type === 'option') {
      entries.push({ options: [parseOption(child)] });
    }
  });
  return entries;
}

function toRadixValue(value: string | number | readonly string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  const s = String(value);
  return s === '' ? EMPTY_SENTINEL : s;
}

type SelectProps = {
  className?: string;
  children?: React.ReactNode;
  value?: string | number | readonly string[];
  defaultValue?: string | number | readonly string[];
  onChange?: (event: { target: { value: string; name?: string } }) => void;
  disabled?: boolean;
  name?: string;
  id?: string;
  title?: string;
  'aria-label'?: string;
};

export function Select({ className, children, value, defaultValue, onChange, disabled, name, id, title, ...props }: SelectProps) {
  const entries = React.useMemo(() => parseChildren(children), [children]);
  const flat = React.useMemo(() => entries.flatMap((e) => e.options), [entries]);

  const rootValue = toRadixValue(value);
  const rootDefault = toRadixValue(defaultValue);
  // 非受控用法对齐原生行为：默认选中第一个选项。
  const effectiveValue = rootValue ?? rootDefault ?? toRadixValue(flat[0]?.value);

  const handleChange = (v: string): void => {
    onChange?.({ target: { value: v === EMPTY_SENTINEL ? '' : v, name } });
  };

  return (
    <SelectPrimitive.Root value={effectiveValue} onValueChange={handleChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-left text-sm shadow-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'data-[placeholder]:text-muted-foreground [&>span:first-child]:truncate',
          className
        )}
        id={id}
        title={title}
        {...props}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-popover max-h-96 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-fade-in"
        >
          <SelectPrimitive.Viewport className="p-1">
            {entries.map((entry, gi) => {
              const items = entry.options.map((opt) => {
                const itemValue = opt.value === '' ? EMPTY_SENTINEL : opt.value;
                return (
                  <SelectPrimitive.Item
                    key={opt.value}
                    value={itemValue}
                    disabled={opt.disabled}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-3 pr-8 text-sm outline-none',
                      'focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
                    )}
                  >
                    <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator className="absolute right-2 flex items-center">
                      <Check className="size-4 text-primary" />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                );
              });
              return entry.groupLabel !== undefined ? (
                <SelectPrimitive.Group key={gi}>
                  <SelectPrimitive.Label className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {entry.groupLabel}
                  </SelectPrimitive.Label>
                  {items}
                </SelectPrimitive.Group>
              ) : (
                <React.Fragment key={gi}>{items}</React.Fragment>
              );
            })}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
