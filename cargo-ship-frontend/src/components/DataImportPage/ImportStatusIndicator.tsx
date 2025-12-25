/**
 * 导入状态指示器组件
 *
 * 职责：
 * - 展示当前导入任务的状态（idle, uploading, processing, success, error）
 * - 通过图标和文字清晰地展示当前阶段
 * - 提供流畅的动画效果
 *
 * @module components/DataImportPage/ImportStatusIndicator
 */

import React from 'react';
import {
  Clock,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Progress } from '../ui/progress';

/**
 * 导入状态类型
 */
export type ImportStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

/**
 * 导入状态指示器组件的 Props
 */
export interface ImportStatusIndicatorProps {
  /** 当前导入状态 */
  status: ImportStatus;

  /** 上传进度（0-100），仅在 uploading 状态时使用 */
  progress?: number;

  /** 文件名，用于显示正在处理的文件 */
  fileName?: string;

  /** 错误信息，仅在 error 状态时显示 */
  errorMessage?: string;

  /** 取消上传回调函数 */
  onCancel?: () => void;

  /** 批量处理进度索引 (WebSocket 分片序号) */
  batchIndex?: number;

  /** 批量处理总分片数 */
  batchTotal?: number;

  /** 自定义类名 */
  className?: string;
}

/**
 * 状态配置映射
 * 定义每种状态对应的图标、文字、颜色等
 */
const statusConfig = {
  idle: {
    Icon: Clock,
    text: '等待上传',
    textColor: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    borderColor: 'border-slate-500/30',
    iconColor: 'text-slate-400',
  },
  uploading: {
    Icon: Upload,
    getText: (progress?: number) => `上传中 ${progress !== undefined ? `(${Math.round(progress)}%)` : ''}`,
    textColor: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/30',
    iconColor: 'text-cyan-400',
    showProgress: true,
  },
  processing: {
    Icon: Loader2,
    text: '处理中',
    textColor: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    animated: true,
  },
  success: {
    Icon: CheckCircle,
    text: '导入成功',
    textColor: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    iconColor: 'text-green-400',
  },
  error: {
    Icon: AlertCircle,
    text: '导入失败',
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    iconColor: 'text-red-400',
    showError: true,
  },
} as const;

/**
 * ImportStatusIndicator 组件
 *
 * 使用示例：
 * ```tsx
 * <ImportStatusIndicator
 *   status="uploading"
 *   progress={75}
 *   fileName="data.csv"
 * />
 * ```
 */
export function ImportStatusIndicator({
  status,
  progress = 0,
  fileName,
  errorMessage,
  batchIndex,
  batchTotal,
  className = '',
}: ImportStatusIndicatorProps) {
  // 获取当前状态的配置
  const config = statusConfig[status];
  const Icon = config.Icon;
  const textColor = config.textColor;
  const bgColor = config.bgColor;
  const borderColor = config.borderColor;
  const iconColor = config.iconColor;

  // 可选属性的安全访问
  const isAnimated = 'animated' in config && config.animated === true;
  const hasShowProgress = 'showProgress' in config && config.showProgress === true;
  const hasShowError = 'showError' in config && config.showError === true;

  // 获取状态文本
  const text = 'getText' in config && typeof config.getText === 'function'
    ? config.getText(progress)
    : ('text' in config ? config.text : '');

  return (
    <div
      className={`
        rounded-lg border p-6
        ${bgColor} ${borderColor}
        backdrop-blur-sm
        transition-all duration-300
        ${className}
      `}
    >
      {/* 状态标题区域 */}
      <div className="flex items-center gap-3 mb-4">
        {/* 状态图标 */}
        <Icon
          className={`
            w-6 h-6
            ${iconColor}
            ${isAnimated ? 'animate-spin' : ''}
          `}
        />

        {/* 状态文本 */}
        <span className={`text-lg font-semibold ${textColor}`}>
          {text}
        </span>
      </div>

      {/* 文件名显示（如果提供） */}
      {fileName && (
        <div className="mb-3">
          <p className="text-sm text-slate-300">
            文件：<span className="font-mono">{fileName}</span>
          </p>
        </div>
      )}

      {/* 上传进度条（仅在 uploading 状态时显示） */}
      {hasShowProgress && (
        <div className="space-y-2">
          <Progress
            value={progress}
            className="h-2"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>已上传 {Math.round(progress)}%</span>
            <span>{Math.round(progress) < 100 ? '上传中...' : '上传完成'}</span>
          </div>
        </div>
      )}

      {/* 错误信息显示（仅在 error 状态时显示） */}
      {hasShowError && errorMessage && (
        <div className="mt-3 p-3 bg-red-900/30 border border-red-500/30 rounded">
          <p className="text-sm text-red-300">
            <strong>错误：</strong>{errorMessage}
          </p>
        </div>
      )}

      {/* 处理中的提示文本与进度条 (WebSocket 分片进度) */}
      {status === 'processing' && (
        <div className="mt-3 space-y-4">
          <p className="text-sm text-slate-400">
            正在校验和入库数据，请稍候...
          </p>

          {/* 如果有批量分片进度，展示进度条 */}
          {batchIndex !== undefined && batchTotal !== undefined && batchTotal > 0 && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-500">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-blue-400 font-medium ml-1">数据同步进度</span>
                <span className="text-slate-400">{Math.round((batchIndex / batchTotal) * 100)}%</span>
              </div>
              <Progress
                value={(batchIndex / batchTotal) * 100}
                className="h-2 bg-slate-800"
              />
              <p className="text-[10px] text-slate-500 text-right italic">
                正在通过 WebSocket 接收分片 {batchIndex} / {batchTotal}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 成功的提示文本 */}
      {status === 'success' && (
        <div className="mt-3">
          <p className="text-sm text-green-300">
            数据已成功导入系统
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * 默认导出
 */
export default ImportStatusIndicator;
