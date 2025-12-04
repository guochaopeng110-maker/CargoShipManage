/**
 * 货船智能机舱管理系统 - 输入框UI组件
 * 
 * 基于Tailwind CSS构建的可复用输入框组件
 * 支持多种样式状态和交互效果，适用于表单输入场景
 */

// 导入React核心库
import * as React from "react"; // React类型定义和钩子

// 导入自定义工具函数
import { cn } from "./utils"; // cn函数用于合并CSS类名

/**
 * 输入框组件属性接口
 * 
 * 继承HTML input元素的所有属性
 */
type InputProps = React.ComponentProps<"input">;

/**
 * 输入框组件
 * 
 * 这是一个高度可定制的输入框组件，提供：
 * 1. 统一的视觉样式（基于设计系统）
 * 2. 完整的交互状态（焦点、悬停、禁用等）
 * 3. 无障碍性支持（ARIA属性）
 * 4. 深色主题适配
 * 5. 文件选择样式支持
 * 
 * 使用示例：
 * ```tsx
 * <Input 
 *   type="text" 
 *   placeholder="请输入用户名" 
 *   value={username}
 *   onChange={(e) => setUsername(e.target.value)}
 * />
 * ```
 * 
 * @param props.className - 自定义CSS类名
 * @param props.type - 输入框类型（text, password, email等）
 * @param props.placeholder - 占位符文本
 * @param props.disabled - 是否禁用
 * @param props.ref - 元素的引用
 */
function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type} // 输入框类型：text, password, email, number等
      data-slot="input" // 用于样式选择器的数据属性
      className={cn(
        // 基础样式类
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base bg-input-background transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        
        // 焦点状态样式：边框和阴影效果
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        
        // 错误状态样式：红色边框和阴影
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        
        className, // 自定义样式类，允许覆盖默认样式
      )}
      {...props} // 展开其他属性（如value、onChange、placeholder等）
    />
  );
}

// 导出输入框组件
export { Input };
