import React from 'react';
import ConsistencyPromptManager from '../../consistency/ConsistencyPromptManager';
import type { ConsistencyPromptSettingsPanelProps } from '../types';

const ConsistencyPromptSettingsPanel: React.FC<ConsistencyPromptSettingsPanelProps> = ({
  templates,
  onTemplatesChange,
}) => {
  return (
    <ConsistencyPromptManager
      templates={templates}
      onTemplatesChange={onTemplatesChange}
    />
  );
};

export default ConsistencyPromptSettingsPanel;
