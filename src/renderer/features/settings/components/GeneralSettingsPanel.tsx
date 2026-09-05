/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React from 'react';
import { Languages, Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation, SUPPORTED_LANGUAGES } from '@/i18n';
import type { AppLanguage, AppTheme } from '@shared/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Label } from '@/shared/ui/Label';
import { Select } from '@/shared/ui/Select';
import { cn } from '@/shared/utils/cn';
import type { GeneralSettingsPanelProps } from '../types';

const THEME_OPTIONS: {
  value: AppTheme;
  icon: typeof Sun;
  labelKey: 'general.theme.light' | 'general.theme.dark' | 'general.theme.system';
}[] = [
  { value: 'light', icon: Sun, labelKey: 'general.theme.light' },
  { value: 'dark', icon: Moon, labelKey: 'general.theme.dark' },
  { value: 'system', icon: Monitor, labelKey: 'general.theme.system' },
];

const GeneralSettingsPanel: React.FC<GeneralSettingsPanelProps> = ({
  language,
  onLanguageChange,
  theme,
  onThemeChange,
}) => {
  const { t } = useTranslation('settings');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="size-4 text-muted-foreground" />
            {t('general.title')}
          </CardTitle>
          <CardDescription>{t('general.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="max-w-xs space-y-2">
            <Label htmlFor="app-language">{t('general.languageLabel')}</Label>
            <Select
              id="app-language"
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as AppLanguage)}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {t(`general.language.${lang}`)}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">{t('general.languageHint')}</p>
          </div>

          <div className="max-w-xs space-y-2">
            <Label>{t('general.themeLabel')}</Label>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('general.themeLabel')}>
              {THEME_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={theme === value}
                  onClick={() => onThemeChange(value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                    theme === value
                      ? 'border-primary bg-accent text-foreground'
                      : 'border-input text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                  )}
                >
                  <Icon className="size-4" />
                  {t(labelKey)}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t('general.themeHint')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneralSettingsPanel;
