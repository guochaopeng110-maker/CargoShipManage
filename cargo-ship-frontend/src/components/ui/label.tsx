/**
 * 货船智能机舱管理系统 - 标签UI组件
 * 
 * 基于Radix UI构建的可复用标签组件
 * 提供无障碍性支持，适用于表单标签、说明文字等场景
 */

// 客户端指令，确保在客户端渲染
"use client";

// 导入React核心库
import * as React from "react"; // React类型定义和钩子

// 导入Radix UI标签组件
import * as LabelPrimitive from "@radix-ui/react-label"; // Radix UI的Label组件，提供无障碍性支持

// 导入自定义工具函数
import { cn } from "./utils"; // cn函数用于合并CSS类名

/**
 * 标签组件属性接口
 * 
 * 继承Radix UI Label组件的所有属性
 */
type LabelProps = React.ComponentProps<typeof LabelPrimitive.Root>;

/**
 * 标签组件
 * 
 * 这是一个高度可定制的标签组件，提供：
 * 1. 完整的无障碍性支持（自动关联输入框）
 * 2. 统一的视觉样式（基于设计系统）
 * 3. 禁用状态处理
 * 4. 响应式设计支持
 * 5. 键盘导航支持
 * 
 * 使用示例：
 * ```tsx
 * <Label htmlFor="username">用户名</Label>
 * <Input id="username" />
 * ```
 * 
 * 注意：使用htmlFor属性关联对应的输入框ID
 * 
 * @param props.className - 自定义CSS类名
 * @param props.htmlFor - 关联的输入框ID，用于无障碍性
 * @param props.children - 标签文本内容
 */
function Label({
  className,
  ...props
}: LabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="label" // 用于样式选择器的数据属性
      className={cn(
        // 基础样式：flex布局、间距、文字样式、选择禁用、组数据处理
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className, // 自定义样式类，允许覆盖默认样式
      )}
      {...props} // 展开其他属性（如htmlFor、children、className等）
    />
  );
}

// 导出标签组件
export { Label };
