/**
 * CRUD表单模态框组件
 *
 * 提供统一的表单弹窗交互，支持创建和编辑模式
 * 使用React Hook Form进行表单管理和验证
 *
 * 功能特性：
 * - 动态表单字段渲染
 * - 表单验证（内置 + 自定义）
 * - 提交和取消处理
 * - 加载状态显示
 * - 错误信息显示
 * - 支持多种字段类型
 */

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Loader2, AlertCircle } from 'lucide-react';
import { CRUDFormModalProps } from '../../types/crud';

/**
 * CRUDFormModal组件
 *
 * 渲染表单模态框
 * 根据字段配置动态生成表单
 *
 * @template T 数据项类型
 * @param props 组件属性
 * @returns React组件
 *
 * @example
 * ```tsx
 * <CRUDFormModal
 *   open={dialogOpen}
 *   onOpenChange={setDialogOpen}
 *   title={editingItem ? '编辑设备' : '添加设备'}
 *   mode={editingItem ? 'edit' : 'create'}
 *   fields={formFields}
 *   defaultValues={editingItem || undefined}
 *   onSubmit={handleSubmit}
 *   loading={loading}
 * />
 * ```
 */
export function CRUDFormModal<T extends Record<string, any>>({
  open,
  onOpenChange,
  title,
  mode,
  loading = false,
  fields,
  defaultValues,
  onSubmit,
  onCancel,
  submitButtonText,
  cancelButtonText = '取消',
  width,
}: CRUDFormModalProps<T>) {
  // 初始化React Hook Form
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<T>({
    defaultValues: defaultValues as any,
  });

  // 当defaultValues变化时，重置表单
  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues as any);
    } else {
      reset({} as any);
    }
  }, [defaultValues, reset, open]);

  // 处理表单提交
  const onFormSubmit = async (data: T) => {
    try {
      await onSubmit(data);
      // 提交成功后重置表单
      reset({} as any);
    } catch (error) {
      console.error('表单提交失败:', error);
    }
  };

  // 处理取消
  const handleCancel = () => {
    reset({} as any);
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  // 渲染表单字段
  const renderField = (field: typeof fields[0]) => {
    const error = errors[field.name as keyof T];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'number':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-slate-200">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type}
              placeholder={field.placeholder}
              disabled={field.disabled || loading}
              className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
              {...register(field.name as any, {
                required: field.required ? `${field.label}为必填项` : false,
                min: field.min !== undefined ? { value: field.min, message: `最小值为${field.min}` } : undefined,
                max: field.max !== undefined ? { value: field.max, message: `最大值为${field.max}` } : undefined,
                minLength: field.minLength !== undefined ? { value: field.minLength, message: `最小长度为${field.minLength}` } : undefined,
                maxLength: field.maxLength !== undefined ? { value: field.maxLength, message: `最大长度为${field.maxLength}` } : undefined,
                validate: field.validation,
              })}
            />
            {field.helperText && !error && (
              <p className="text-xs text-slate-400">{field.helperText}</p>
            )}
            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error.message as string}
              </p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-slate-200">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.name}
              placeholder={field.placeholder}
              disabled={field.disabled || loading}
              rows={field.rows || 3}
              className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
              {...register(field.name as any, {
                required: field.required ? `${field.label}为必填项` : false,
                validate: field.validation,
              })}
            />
            {field.helperText && !error && (
              <p className="text-xs text-slate-400">{field.helperText}</p>
            )}
            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error.message as string}
              </p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-slate-200">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <Select
              value={watch(field.name as any) || ''}
              onValueChange={(value) => setValue(field.name as any, value as any)}
              disabled={field.disabled || loading}
            >
              <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                <SelectValue placeholder={field.placeholder || `请选择${field.label}`} />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {field.options?.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={String(option.value)}
                    className="text-white hover:bg-slate-800"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.helperText && !error && (
              <p className="text-xs text-slate-400">{field.helperText}</p>
            )}
            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error.message as string}
              </p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="flex items-center space-x-2">
            <Checkbox
              id={field.name}
              checked={watch(field.name as any) || false}
              onCheckedChange={(checked) => setValue(field.name as any, checked as any)}
              disabled={field.disabled || loading}
              className="border-slate-700"
            />
            <Label htmlFor={field.name} className="text-slate-200 cursor-pointer">
              {field.label}
            </Label>
          </div>
        );

      case 'radio':
        return (
          <div key={field.name} className="space-y-2">
            <Label className="text-slate-200">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <RadioGroup
              value={watch(field.name as any) || ''}
              onValueChange={(value) => setValue(field.name as any, value as any)}
              disabled={field.disabled || loading}
            >
              {field.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={String(option.value)}
                    id={`${field.name}-${option.value}`}
                    className="border-slate-700"
                  />
                  <Label
                    htmlFor={`${field.name}-${option.value}`}
                    className="text-slate-200 cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error.message as string}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-slate-800 border-slate-700 text-white"
        style={{ maxWidth: width || '600px' }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {title}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleFormSubmit(onFormSubmit)} className="space-y-4">
          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
            {fields.map((field) => renderField(field))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              {cancelButtonText}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {submitButtonText || (mode === 'create' ? '创建' : '保存')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
