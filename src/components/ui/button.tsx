/**
 * 货船智能机舱管理系统 - 按钮UI组件
 * 
 * 基于Radix UI和Tailwind CSS构建的可复用按钮组件
 * 支持多种变体、大小和样式，适应不同的使用场景
 */

// 导入React核心库
import * as React from "react"; // React类型定义和钩子

// 导入第三方UI库
import { Slot } from "@radix-ui/react-slot"; // Radix UI的Slot组件，允许组件渲染为其他组件
import { cva, type VariantProps } from "class-variance-authority"; // class-variance-authority库，用于定义组件变体

// 导入自定义工具函数
import { cn } from "./utils"; // cn函数用于合并CSS类名

/**
 * 按钮变体定义
 * 
 * 使用cva (class-variance-authority) 定义按钮的不同样式变体
 * 每个变体对应不同的使用场景和视觉样式
 */
const buttonVariants = cva(
  // 基础样式：内联布局、居中对齐、圆角、文字样式、过渡动画、禁用状态样式
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    // 变体定义
    variants: {
      /**
       * 按钮风格变体
       * 
       * - default: 默认样式，主要用于主要操作
       * - destructive: 危险操作样式，用于删除等危险操作
       * - outline: 轮廓样式，用于次要操作
       * - secondary: 次要样式，用于辅助操作
       * - ghost: 幽灵样式，轻量级样式
       * - link: 链接样式，文本按钮样式
       */
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90", // 默认：主色背景，白色文字，悬停时主色加深
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60", // 危险：红色背景，白色文字
        outline:
          "border bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50", // 轮廓：边框样式，透明背景
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80", // 次要：次要色背景
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50", // 幽灵：只有悬停效果
        link: "text-primary underline-offset-4 hover:underline", // 链接：主色文字，下划线
      },
      /**
       * 按钮大小变体
       * 
       * 控制按钮的内边距、高度等尺寸相关样式
       */
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3", // 默认：高度36px，正常内边距
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5", // 小号：高度32px，较小内边距
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4", // 大号：高度40px，较大内边距
        icon: "size-9 rounded-md", // 图标：正方形，大小为9个单位
      },
    },
    // 默认变体
    defaultVariants: {
      variant: "default", // 默认风格为default
      size: "default", // 默认大小为default
    },
  },
);

/**
 * 按钮组件属性接口
 * 
 * 继承HTML button元素的所有属性，并添加自定义属性
 */
type ButtonProps = React.ComponentProps<"button"> & // 继承button元素的所有属性
  VariantProps<typeof buttonVariants> & // 继承buttonVariants的变体属性
  {
    asChild?: boolean; // 是否作为子组件渲染（使用Slot组件）
  };

/**
 * 按钮组件
 * 
 * 这是一个高度可复用的按钮组件，支持：
 * 1. 多种视觉变体（默认、危险、轮廓、次要、幽灵、链接）
 * 2. 多种尺寸（小号、默认、大号、图标）
 * 3. 灵活的渲染方式（普通button或Slot组件）
 * 4. 完整的无障碍性支持
 * 5. 丰富的交互状态（悬停、焦点、禁用等）
 * 
 * @param props.className - 自定义CSS类名
 * @param props.variant - 按钮风格变体
 * @param props.size - 按钮大小变体
 * @param props.asChild - 是否使用Slot渲染
 * @param props.ref - 元素的引用
 */
const Button = React.forwardRef<
  HTMLButtonElement, // 按钮元素的类型
  ButtonProps // 按钮组件的属性类型
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  // 根据asChild属性决定渲染为Slot还是普通button元素
  const Comp = asChild ? Slot : "button"; // 如果asChild为true，使用Slot组件，否则使用button元素

  return (
    <Comp
      ref={ref} // 转发ref给子组件
      data-slot="button" // 用于样式选择器的数据属性
      className={cn(buttonVariants({ variant, size, className }))} // 合并基础样式和自定义样式
      {...props} // 展开其他属性（如onClick、disabled等）
    />
  );
});

// 设置组件的显示名称，便于调试
Button.displayName = "Button";

// 导出组件和变体定义
export { Button, buttonVariants };
