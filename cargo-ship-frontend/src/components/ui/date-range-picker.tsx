/**
 * 日期范围选择器组件
 *
 * 功能特性：
 * - 支持选择日期范围（起始日期和结束日期）
 * - 提供快捷时间范围选项（最近7天、最近30天、本月、上月等）
 * - 自动验证日期范围合法性
 * - 响应式设计，适配不同屏幕尺寸
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 1.0.0
 */

'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { cn } from './utils';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

/**
 * 日期范围预设选项接口
 */
export interface DateRangePreset {
  /** 预设名称（显示文本） */
  label: string;
  /** 获取日期范围的函数 */
  getValue: () => DateRange;
}

/**
 * 默认预设时间范围选项
 */
export const DEFAULT_DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    label: '最近7天',
    getValue: () => ({
      from: subDays(new Date(), 6), // 包含今天，所以是减6天
      to: new Date(),
    }),
  },
  {
    label: '最近30天',
    getValue: () => ({
      from: subDays(new Date(), 29), // 包含今天，所以是减29天
      to: new Date(),
    }),
  },
  {
    label: '本月',
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: new Date(),
    }),
  },
  {
    label: '上月',
    getValue: () => ({
      from: startOfMonth(subMonths(new Date(), 1)),
      to: endOfMonth(subMonths(new Date(), 1)),
    }),
  },
];

/**
 * DateRangePicker 组件属性接口
 */
export interface DateRangePickerProps {
  /** 当前选中的日期范围 */
  value?: DateRange;
  /** 日期范围变化时的回调函数 */
  onChange?: (range: DateRange | undefined) => void;
  /** 自定义预设选项（不提供则使用默认预设） */
  presets?: DateRangePreset[];
  /** 最小可选日期 */
  minDate?: Date;
  /** 最大可选日期 */
  maxDate?: Date;
  /** 最大时间跨度（天数） */
  maxRange?: number;
  /** 占位符文本 */
  placeholder?: string;
  /** 自定义类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 日期范围选择器组件
 *
 * 使用示例：
 * ```tsx
 * const [dateRange, setDateRange] = useState<DateRange>();
 *
 * <DateRangePicker
 *   value={dateRange}
 *   onChange={setDateRange}
 *   placeholder="请选择日期范围"
 * />
 * ```
 */
export function DateRangePicker({
  value,
  onChange,
  presets = DEFAULT_DATE_RANGE_PRESETS,
  minDate,
  maxDate,
  maxRange,
  placeholder = '选择日期范围',
  className,
  disabled = false,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  /**
   * 处理日期范围选择
   * 包含日期范围验证逻辑
   */
  const handleSelect = React.useCallback(
    (range: DateRange | undefined) => {
      // 如果选择了完整的日期范围，进行验证
      if (range?.from && range?.to) {
        // 验证开始时间不能晚于结束时间
        if (range.from > range.to) {
          console.warn('开始时间不能晚于结束时间');
          return;
        }

        // 验证最大时间跨度
        if (maxRange) {
          const daysDiff = Math.ceil(
            (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysDiff > maxRange) {
            console.warn(`时间跨度不能超过 ${maxRange} 天`);
            return;
          }
        }
      }

      // 验证通过，更新日期范围
      onChange?.(range);
    },
    [onChange, maxRange]
  );

  /**
   * 处理预设选项点击
   */
  const handlePresetClick = React.useCallback(
    (preset: DateRangePreset) => {
      const range = preset.getValue();
      handleSelect(range);
      setOpen(false); // 选择预设后关闭弹出层
    },
    [handleSelect]
  );

  /**
   * 格式化日期范围显示文本
   */
  const formatDateRange = React.useCallback((range: DateRange | undefined) => {
    if (!range) {
      return placeholder;
    }

    if (range.from) {
      if (range.to) {
        // 完整日期范围
        return `${format(range.from, 'yyyy-MM-dd', { locale: zhCN })} - ${format(
          range.to,
          'yyyy-MM-dd',
          { locale: zhCN }
        )}`;
      } else {
        // 仅选择了开始日期
        return `${format(range.from, 'yyyy-MM-dd', { locale: zhCN })} - ...`;
      }
    }

    return placeholder;
  }, [placeholder]);

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date-range-picker"
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* 左侧：预设选项 */}
            {presets && presets.length > 0 && (
              <div className="flex flex-col gap-1 border-r p-3">
                <div className="px-2 py-1.5 text-sm font-semibold text-slate-700">
                  快捷选择
                </div>
                {presets.map((preset, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="justify-start font-normal"
                    onClick={() => handlePresetClick(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            )}

            {/* 右侧：日历 */}
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={value?.from}
                selected={value}
                onSelect={handleSelect}
                numberOfMonths={2}
                disabled={(date) => {
                  // 禁用超出范围的日期
                  if (minDate && date < minDate) return true;
                  if (maxDate && date > maxDate) return true;
                  return false;
                }}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
