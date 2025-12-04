import * as React from "react";

// 导入工具函数，用于合并CSS类名
import { cn } from "./utils";

/**
 * 卡片主容器组件
 * 提供一个具有卡片外观的基础容器，支持自定义样式类名
 *
 * @param className - 自定义CSS类名，可选
 * @param props - 其他div元素的原生属性
 * @returns JSX.Element - 卡片容器元素
 */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border", // 基础样式：背景色、文字色、弹性布局、间距、圆角、边框
        className, // 用户自定义样式
      )}
      {...props} // 展开其他原生属性
    />
  );
}

/**
 * 卡片头部组件
 * 用于放置卡片标题、描述等头部信息，支持响应式布局
 * 当包含卡片操作按钮时自动调整为两列布局
 *
 * @param className - 自定义CSS类名，可选
 * @param props - 其他div元素的原生属性
 * @returns JSX.Element - 卡片头部元素
 */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6", // 网格布局、自动行高、内边距等
        className,
      )}
      {...props}
    />
  );
}

/**
 * 卡片标题组件
 * 用于显示卡片的主要标题，语义化使用h4标签
 *
 * @param className - 自定义CSS类名，可选
 * @param props - 其他div元素的原生属性
 * @returns JSX.Element - 卡片标题元素
 */
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <h4
      data-slot="card-title"
      className={cn("leading-none", className)} // 无行高，标题更紧凑
      {...props}
    />
  );
}

/**
 * 卡片描述组件
 * 用于显示卡片的描述信息，通常使用较浅的颜色
 *
 * @param className - 自定义CSS类名，可选
 * @param props - 其他p元素的原生属性
 * @returns JSX.Element - 卡片描述元素
 */
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-muted-foreground", className)} // 使用静音颜色
      {...props}
    />
  );
}

/**
 * 卡片操作区域组件
 * 用于放置操作按钮，通常位于卡片头部的右侧
 * 使用网格定位实现精确布局
 *
 * @param className - 自定义CSS类名，可选
 * @param props - 其他div元素的原生属性
 * @returns JSX.Element - 卡片操作区域元素
 */
function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end", // 网格定位：从第2列开始，跨2行，从第1行开始，右对齐
        className,
      )}
      {...props}
    />
  );
}

/**
 * 卡片内容区域组件
 * 用于放置卡片的主要内容，通常是文本、列表或其他组件
 *
 * @param className - 自定义CSS类名，可选
 * @param props - 其他div元素的原生属性
 * @returns JSX.Element - 卡片内容区域元素
 */
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 [&:last-child]:pb-6", className)} // 内边距，最后一个元素底部无额外间距
      {...props}
    />
  );
}

/**
 * 卡片底部组件
 * 用于放置卡片的底部信息，如操作按钮、分页等
 *
 * @param className - 自定义CSS类名，可选
 * @param props - 其他div元素的原生属性
 * @returns JSX.Element - 卡片底部元素
 */
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 pb-6 [.border-t]:pt-6", className)} // 弹性布局、居中对齐、内边距
      {...props}
    />
  );
}

// 导出所有卡片相关组件
export {
  Card,           // 主卡片容器
  CardHeader,     // 卡片头部
  CardFooter,     // 卡片底部
  CardTitle,      // 卡片标题
  CardAction,     // 卡片操作
  CardDescription, // 卡片描述
  CardContent,    // 卡片内容
};
