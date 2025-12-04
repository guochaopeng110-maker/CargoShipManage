// Toast提示系统Hook
// 提供简单的前端提示功能

import React from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

export interface ToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

let toastQueue: Toast[] = [];
let toastListeners: ((toasts: Toast[]) => void)[] = [];

export const toast = ({ title, description, variant = 'default', duration = 3000 }: ToastProps) => {
  const id = Date.now().toString();
  const newToast: Toast = {
    id,
    title,
    description,
    variant,
    duration,
  };

  toastQueue = [...toastQueue, newToast];
  notifyListeners();

  // 自动移除toast
  setTimeout(() => {
    removeToast(id);
  }, duration);

  return id;
};

export const removeToast = (id: string) => {
  toastQueue = toastQueue.filter(toast => toast.id !== id);
  notifyListeners();
};

export const clearAllToasts = () => {
  toastQueue = [];
  notifyListeners();
};

const notifyListeners = () => {
  toastListeners.forEach(listener => listener([...toastQueue]));
};

export const useToast = () => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  React.useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setToasts(newToasts);
    };

    toastListeners.push(listener);
    listener(toastQueue); // 初始化当前toast

    return () => {
      const index = toastListeners.indexOf(listener);
      if (index > -1) {
        toastListeners.splice(index, 1);
      }
    };
  }, []);

  return {
    toast,
    toasts,
    dismiss: removeToast,
  };
};

// 简单的console.log包装器作为后备
const simpleToast = ({ title, description, variant = 'default' }: ToastProps) => {
  const message = `${title}${description ? ': ' + description : ''}`;
  switch (variant) {
    case 'destructive':
      console.error(message);
      break;
    case 'success':
      console.log('✅ ' + message);
      break;
    default:
      console.info('ℹ️ ' + message);
  }
};

// 如果React不可用，使用简单的toast
export const fallbackToast = simpleToast;