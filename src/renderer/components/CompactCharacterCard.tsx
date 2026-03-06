import React from 'react';
import { Character } from '../types';

interface CompactCharacterCardProps {
  character: Character;
  onClick: () => void;
}

const CompactCharacterCard: React.FC<CompactCharacterCardProps> = ({ character, onClick }) => {
  // 根据角色类型获取颜色和图标
  const getRoleConfig = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('主')) {
      return {
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: 'fas fa-crown',
        label: '主角'
      };
    }
    if (roleLower.includes('反')) {
      return {
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: 'fas fa-skull',
        label: '反派'
      };
    }
    if (roleLower.includes('配')) {
      return {
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: 'fas fa-user-friends',
        label: '配角'
      };
    }
    return {
      color: 'bg-gray-100 text-gray-600 border-gray-200',
      icon: 'fas fa-user',
      label: role || '未知'
    };
  };

  const roleConfig = getRoleConfig(character.role);

  return (
    <div 
      className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col"
      onClick={onClick}
    >
      {/* 顶部：角色名称和类型 */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-black text-gray-900 truncate">{character.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${roleConfig.color} flex items-center gap-1.5`}>
              <i className={`${roleConfig.icon} text-[8px]`}></i>
              {roleConfig.label}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              {character.gender ? character.gender : '未知'}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              {character.age ? `${character.age}岁` : '年龄未知'}
            </span>
          </div>
        </div>
        <div className="text-gray-300 hover:text-gray-600 transition-colors">
          <i className="fas fa-chevron-right text-sm"></i>
        </div>
      </div>

      {/* 外观描述 */}
      <div className="mb-4 flex-1">
        <div className="flex items-center gap-2 mb-2">
          <i className="fas fa-eye text-blue-400 text-xs"></i>
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">外观描述</span>
        </div>
        <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
          {character.appearance || '暂无外观描述'}
        </p>
      </div>

      {/* 标志性特征 */}
      <div className="pt-4 border-t border-gray-50">
        <div className="flex items-center gap-2 mb-2">
          <i className="fas fa-star text-amber-400 text-xs"></i>
          <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">标志性特征</span>
        </div>
        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
          {character.distinctiveFeatures || '暂无标志性特征'}
        </p>
      </div>

      {/* 底部提示 */}
      <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
        <span className="text-[9px] text-gray-400 font-medium">点击查看完整档案</span>
        <span className="text-[9px] text-gray-300">
          <i className="fas fa-info-circle mr-1"></i>
          详细
        </span>
      </div>
    </div>
  );
};

export default CompactCharacterCard;
