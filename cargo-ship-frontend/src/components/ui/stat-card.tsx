/**
 * 统计卡片组件
 *
 * 用于在管理页面中显示统计信息的通用卡片组件
 */

import React from 'react';
import { Card } from './card';

export interface StatCardProps {
  /** 标签文本 */
  label: string;
  /** 显示的值 */
  value: string | number;
  /** 颜色主题 */
  color: 'slate' | 'blue' | 'green' | 'yellow' | 'red' | 'cyan';
  /** 可选图标 */
  icon?: React.ReactNode;
  /** 布局方式：center 为居中，flex 为左右布局 */
  layout?: 'center' | 'flex';
}

/**
 * 统计卡片组件
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  color,
  icon,
  layout = 'center'
}) => {
  const colorClasses = {
    slate: 'text-slate-100',
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    cyan: 'text-cyan-400',
  };

  if (layout === 'flex' && icon) {
    return (
      <Card className="bg-slate-800/60 border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
            <div className="text-slate-400 text-sm">{label}</div>
          </div>
          {icon && <div className="text-slate-500">{icon}</div>}
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/60 border-slate-700 p-4">
      <div className="text-center">
        <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
        <div className="text-slate-400 text-sm">{label}</div>
      </div>
    </Card>
  );
};
