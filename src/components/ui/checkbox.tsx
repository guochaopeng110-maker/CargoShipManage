/**
 * 货船智能机舱管理系统 - 复选框UI组件
 * 
 * 基于Radix UI构建的可复用复选框组件
 * 提供完整的交互状态和无障碍性支持，适用于表单场景
 */

// 客户端指令，确保在客户端渲染
"use client";

// 导入React核心库
import * as React from "react"; // React类型定义和钩子

// 导入Radix UI复选框组件
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"; // Radix UI的Checkbox组件，提供无障碍性和键盘导航

// 导入图标组件
import { CheckIcon } from "lucide-react"; // Lucide React的检查图标，用于显示选中状态

// 导入自定义工具函数
import { cn } from "./utils"; // cn函数用于合并CSS类名

/**
 * 复选框组件属性接口
 * 
 * 继承Radix UI Checkbox组件的所有属性
 */
type CheckboxProps = React.ComponentProps<typeof CheckboxPrimitive.Root>;

/**
 * 复选框组件
 * 
 * 这是一个高度可定制的复选框组件，提供：
 * 1. 完整的无障碍性支持（键盘导航、屏幕阅读器）
 * 2. 多种交互状态（选中、未选中、禁用、焦点等）
 * 3. 深色主题适配
 * 4. 错误状态处理（红色边框和阴影）
 * 5. 流畅的动画过渡效果
 * 
 * 使用示例：
 * ```tsx
 * <Checkbox 
 *   checked={isChecked}
 *   onCheckedChange={setIsChecked}
 * />
 * ```
 * 
 * @param props.className - 自定义CSS类名
 * @param props.checked - 是否选中状态
 * @param props.onCheckedChange - 状态变化回调函数
 * @param props.disabled - 是否禁用
 * @param props.ref - 元素的引用
 */
function Checkbox({
  className,
  ...props
}: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox" // 用于样式选择器的数据属性
      className={cn(
        // 基础样式：边框、背景、尺寸、圆角、阴影、过渡动画
        "peer border bg-input-background dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        
        /* 
         * 样式说明：
         * - peer: 与对应标签建立对等关系
         * - data-[state=checked]: 选中状态的样式
         * - focus-visible: 键盘焦点时的样式
         * - aria-invalid: 错误状态的样式
         * - disabled: 禁用状态的样式
         */
        
        className, // 自定义样式类，允许覆盖默认样式
      )}
      {...props} // 展开其他属性（如checked、onCheckedChange、disabled等）
    >
      {/* 复选框指示器 - 显示选中状态的图标 */}
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator" // 用于样式选择器的数据属性
        className={cn(
          // 指示器样式：居中对齐、文字颜色、禁用过渡动画
          "flex items-center justify-center text-current transition-none",
        )}
      >
        {/* 检查图标 - 仅在选中状态时显示 */}
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

// 导出复选框组件
export { Checkbox };
