/**
 * 文件上传区域组件
 *
 * 职责：
 * - 提供文件拖放和点击选择功能
 * - 显示已选文件的基本信息
 * - 进行文件类型和大小验证
 * - 提供清晰的视觉反馈
 *
 * @module components/DataImportPage/FileUploadZone
 */

import React, { useCallback, useState, useRef } from 'react';
import { CloudUpload, FileText, X } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * 文件上传区域组件的 Props
 */
export interface FileUploadZoneProps {
  /** 文件选择回调 */
  onFileSelect: (file: File) => void;

  /** 接受的文件类型 MIME 类型数组 */
  acceptedTypes?: string[];

  /** 最大文件大小（字节），默认 50MB */
  maxSize?: number;

  /** 是否禁用 */
  disabled?: boolean;

  /** 当前已选文件 */
  selectedFile?: File | null;

  /** 清除文件回调 */
  onClearFile?: () => void;
}

/**
 * 默认接受的文件类型
 */
const DEFAULT_ACCEPTED_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

/**
 * 默认最大文件大小: 50MB
 */
const DEFAULT_MAX_SIZE = 50 * 1024 * 1024;

/**
 * 格式化文件大小
 *
 * @param bytes - 文件大小（字节）
 * @returns 格式化后的文件大小字符串
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 获取文件扩展名
 *
 * @param filename - 文件名
 * @returns 文件扩展名
 */
function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2).toUpperCase();
}

/**
 * FileUploadZone 组件
 *
 * 使用示例：
 * ```tsx
 * <FileUploadZone
 *   onFileSelect={(file) => console.log('Selected:', file)}
 *   selectedFile={selectedFile}
 *   onClearFile={() => setSelectedFile(null)}
 * />
 * ```
 */
export function FileUploadZone({
  onFileSelect,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  maxSize = DEFAULT_MAX_SIZE,
  disabled = false,
  selectedFile = null,
  onClearFile,
}: FileUploadZoneProps) {
  // ===== 状态 =====
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // ===== Refs =====
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ===== 文件验证 =====

  /**
   * 验证文件类型和大小
   *
   * @param file - 要验证的文件
   * @returns 验证是否通过
   */
  const validateFile = useCallback((file: File): boolean => {
    setValidationError(null);

    // 验证文件类型
    if (!acceptedTypes.includes(file.type)) {
      setValidationError('文件类型不支持。仅支持 CSV 和 Excel 文件。');
      return false;
    }

    // 验证文件大小
    if (file.size > maxSize) {
      setValidationError(`文件过大。请选择小于 ${formatFileSize(maxSize)} 的文件。`);
      return false;
    }

    return true;
  }, [acceptedTypes, maxSize]);

  // ===== 事件处理 =====

  /**
   * 处理文件选择
   *
   * @param file - 选中的文件
   */
  const handleFileSelection = useCallback((file: File) => {
    if (validateFile(file)) {
      onFileSelect(file);
      setValidationError(null);
    }
  }, [validateFile, onFileSelect]);

  /**
   * 处理拖拽事件
   *
   * @param e - 拖拽事件
   */
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, [disabled]);

  /**
   * 处理文件拖放
   *
   * @param e - 拖放事件
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  }, [disabled, handleFileSelection]);

  /**
   * 处理文件输入变化
   *
   * @param e - 输入变化事件
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
      // 关键点：处理完后清空 value，这样下次选择同一个文件也能触发 onChange 变化
      e.target.value = '';
    }
  }, [handleFileSelection]);

  /**
   * 触发文件选择对话框
   */
  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * 清除已选文件
   */
  const handleClearFile = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setValidationError(null);
    onClearFile?.();
  }, [onClearFile]);

  return (
    <div className="space-y-4">
      {/* 拖放上传区域 */}
      <div
        className={`
          relative
          border-2 border-dashed rounded-lg
          p-12
          text-center
          transition-all duration-300
          ${dragActive
            ? 'border-cyan-400 bg-cyan-400/10 scale-[1.02]'
            : 'border-slate-600 hover:border-slate-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${selectedFile ? 'bg-slate-800/50' : 'bg-slate-900/30'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={!disabled && !selectedFile ? handleButtonClick : undefined}
      >
        {/* 云上传图标 */}
        <CloudUpload
          className={`
            w-16 h-16 mx-auto mb-4
            ${dragActive ? 'text-cyan-400' : 'text-slate-400'}
            transition-colors duration-300
          `}
        />

        {/* 提示文字 */}
        <p className="text-slate-300 mb-2 text-lg">
          {selectedFile
            ? '已选择文件'
            : '将文件拖放到此处或点击选择'
          }
        </p>

        <p className="text-slate-500 text-sm">
          支持格式：CSV, Excel（.xls, .xlsx）
        </p>

        <p className="text-slate-500 text-sm">
          最大文件大小：{formatFileSize(maxSize)}
        </p>

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />

        {/* 选择文件按钮 */}
        {!selectedFile && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleButtonClick();
            }}
            disabled={disabled}
            className="mt-4 bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            选择文件
          </Button>
        )}
      </div>

      {/* 已选文件信息 */}
      {selectedFile && (
        <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
          <div className="flex items-center gap-3 flex-1">
            {/* 文件图标 */}
            <FileText className="w-6 h-6 text-cyan-400" />

            {/* 文件信息 */}
            <div className="flex-1 min-w-0">
              <p className="text-slate-200 font-medium truncate">
                {selectedFile.name}
              </p>
              <div className="flex gap-4 text-sm text-slate-400 mt-1">
                <span>{formatFileSize(selectedFile.size)}</span>
                <span className="px-2 py-0.5 bg-slate-700 rounded text-xs">
                  {getFileExtension(selectedFile.name)}
                </span>
              </div>
            </div>
          </div>

          {/* 清除按钮 */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClearFile}
            disabled={disabled}
            className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* 验证错误提示 */}
      {validationError && (
        <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-300 flex items-center gap-2">
            <X className="w-4 h-4" />
            <strong>错误：</strong>{validationError}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * 默认导出
 */
export default FileUploadZone;
