/**
 * 货船智能机舱管理系统 - 确认对话框组件
 * 
 * 功能说明：
 * 1. 提供统一的操作确认对话框
 * 2. 支持自定义标题、描述和按钮
 * 3. 提供预设的常用确认场景
 * 4. 支持异步操作确认
 * 5. 提供键盘快捷键支持
 * 
 * @version 1.0.0
 * @author 货船智能机舱管理系统开发团队
 * @since 2024-12-01
 */

import React, { useState, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog';
import { Button } from './button';
import { Loader2, AlertTriangle, Trash2, Save, X } from 'lucide-react';
import { cn } from './utils';

// 确认对话框类型枚举
export enum ConfirmDialogType {
  DEFAULT = 'default',
  DELETE = 'delete',
  SAVE = 'save',
  WARNING = 'warning',
  DANGER = 'danger',
}

// 确认对话框属性接口
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmDialogType;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  disabled?: boolean;
  showIcon?: boolean;
  className?: string;
}

/**
 * 确认对话框组件
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  type = ConfirmDialogType.DEFAULT,
  onConfirm,
  onCancel,
  loading = false,
  disabled = false,
  showIcon = true,
  className,
}) => {
  // 处理确认操作
  const handleConfirm = useCallback(async () => {
    if (loading || disabled) return;
    
    try {
      await onConfirm?.();
      onOpenChange(false);
    } catch (error) {
      console.error('确认操作失败:', error);
    }
  }, [loading, disabled, onConfirm, onOpenChange]);

  // 处理取消操作
  const handleCancel = useCallback(() => {
    if (loading) return;
    
    onCancel?.();
    onOpenChange(false);
  }, [loading, onCancel, onOpenChange]);

  // 获取对话框类型配置
  const getTypeConfig = useCallback(() => {
    switch (type) {
      case ConfirmDialogType.DELETE:
        return {
          icon: Trash2,
          iconClass: 'text-red-500',
          confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
          title: title || '确认删除',
          description: description || '此操作将永久删除数据，且无法恢复。确定要继续吗？',
          confirmText: confirmText || '删除',
        };
      case ConfirmDialogType.SAVE:
        return {
          icon: Save,
          iconClass: 'text-green-500',
          confirmClass: 'bg-green-600 hover:bg-green-700 text-white',
          title: title || '确认保存',
          description: description || '确定要保存当前更改吗？',
          confirmText: confirmText || '保存',
        };
      case ConfirmDialogType.WARNING:
        return {
          icon: AlertTriangle,
          iconClass: 'text-yellow-500',
          confirmClass: 'bg-yellow-600 hover:bg-yellow-700 text-white',
          title: title || '操作警告',
          description: description || '此操作可能会产生重要影响，请谨慎操作。',
          confirmText: confirmText || '继续',
        };
      case ConfirmDialogType.DANGER:
        return {
          icon: AlertTriangle,
          iconClass: 'text-red-600',
          confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
          title: title || '危险操作',
          description: description || '此操作具有高风险，可能导致不可逆的后果。确定要继续吗？',
          confirmText: confirmText || '确认风险',
        };
      default:
        return {
          icon: AlertTriangle,
          iconClass: 'text-blue-500',
          confirmClass: 'bg-blue-600 hover:bg-blue-700 text-white',
          title: title || '确认操作',
          description: description || '确定要执行此操作吗？',
          confirmText: confirmText || '确认',
        };
    }
  }, [type, title, description, confirmText]);

  const config = getTypeConfig();
  const Icon = config.icon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn('bg-slate-800 border-slate-700', className)}>
        <AlertDialogHeader>
          {showIcon && (
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-700 mx-auto mb-4">
              <Icon className={cn('w-6 h-6', config.iconClass)} />
            </div>
          )}
          <AlertDialogTitle className="text-slate-200 text-center">
            {config.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400 text-center">
            {config.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3">
          <AlertDialogCancel asChild>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <X className="w-4 h-4 mr-2" />
              {cancelText}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              onClick={handleConfirm}
              disabled={disabled || loading}
              className={cn(config.confirmClass, 'flex items-center')}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Icon className="w-4 h-4 mr-2" />
                  {config.confirmText}
                </>
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/**
 * 确认对话框Hook
 */
export const useConfirmDialog = () => {
  const [state, setState] = useState<{
    open: boolean;
    config: Partial<ConfirmDialogProps>;
  }>({
    open: false,
    config: {},
  });

  // 显示确认对话框
  const showConfirm = useCallback((config: Partial<ConfirmDialogProps>) => {
    setState({
      open: true,
      config,
    });
  }, []);

  // 隐藏确认对话框
  const hideConfirm = useCallback(() => {
    setState(prev => ({
      ...prev,
      open: false,
    }));
  }, []);

  // 预设确认方法
  const confirmDelete = useCallback((onConfirm?: () => void | Promise<void>, description?: string) => {
    showConfirm({
      type: ConfirmDialogType.DELETE,
      description,
      onConfirm,
    });
  }, [showConfirm]);

  const confirmSave = useCallback((onConfirm?: () => void | Promise<void>, description?: string) => {
    showConfirm({
      type: ConfirmDialogType.SAVE,
      description,
      onConfirm,
    });
  }, [showConfirm]);

  const confirmWarning = useCallback((onConfirm?: () => void | Promise<void>, description?: string) => {
    showConfirm({
      type: ConfirmDialogType.WARNING,
      description,
      onConfirm,
    });
  }, [showConfirm]);

  const confirmDanger = useCallback((onConfirm?: () => void | Promise<void>, description?: string) => {
    showConfirm({
      type: ConfirmDialogType.DANGER,
      description,
      onConfirm,
    });
  }, [showConfirm]);

  const confirmCustom = useCallback((config: Partial<ConfirmDialogProps>) => {
    showConfirm(config);
  }, [showConfirm]);

  return {
    open: state.open,
    config: state.config,
    showConfirm,
    hideConfirm,
    confirmDelete,
    confirmSave,
    confirmWarning,
    confirmDanger,
    confirmCustom,
  };
};

/**
 * 确认对话框提供者组件
 */
export const ConfirmDialogProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { open, config, hideConfirm } = useConfirmDialog();

  return (
    <>
      {children}
      <ConfirmDialog
        open={open}
        onOpenChange={hideConfirm}
        {...config}
      />
    </>
  );
};

/**
 * 快速确认对话框组件
 */
export const QuickConfirmDialog: React.FC<{
  trigger: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  type?: ConfirmDialogType;
  confirmText?: string;
  cancelText?: string;
  disabled?: boolean;
}> = ({
  trigger,
  onConfirm,
  title,
  description,
  type = ConfirmDialogType.DEFAULT,
  confirmText,
  cancelText,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (loading || disabled) return;
    
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (error) {
      console.error('确认操作失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-slate-800 border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-slate-200">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button
              variant="outline"
              disabled={loading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              {cancelText || '取消'}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              onClick={handleConfirm}
              disabled={disabled || loading}
              className={cn(
                type === ConfirmDialogType.DELETE && 'bg-red-600 hover:bg-red-700 text-white',
                type === ConfirmDialogType.SAVE && 'bg-green-600 hover:bg-green-700 text-white',
                type === ConfirmDialogType.WARNING && 'bg-yellow-600 hover:bg-yellow-700 text-white',
                type === ConfirmDialogType.DANGER && 'bg-red-600 hover:bg-red-700 text-white',
                type === ConfirmDialogType.DEFAULT && 'bg-blue-600 hover:bg-blue-700 text-white'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                confirmText || '确认'
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;