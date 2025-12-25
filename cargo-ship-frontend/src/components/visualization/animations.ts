/**
 * 核心动画变体配置
 *
 * 功能说明：
 * - 为所有可视化组件提供统一的动画变体
 * - 确保动画语言一致性
 * - 使用 GPU 加速属性（transform, opacity）保证 60fps 性能
 *
 * 主要特性：
 * 1. 状态动画：normal（静止）、warning（脉冲）、critical（闪烁）
 * 2. 数值变化：平滑过渡动画，使用弹簧物理模型
 * 3. 恢复反馈：从告警恢复到正常状态的绿色闪光
 * 4. 加载动画：组件首次加载的淡入效果
 */

import { Variants, Transition } from 'framer-motion';

// ============================================================================
// 动画配置常量
// ============================================================================

/**
 * 动画持续时间配置（单位：秒）
 */
export const ANIMATION_DURATION = {
  /** 快速动画：状态切换、颜色变化 */
  fast: 0.2,
  /** 正常动画：淡入淡出、缩放 */
  normal: 0.3,
  /** 慢速动画：数值变化 */
  slow: 0.8,
  /** 脉冲周期：警告状态 */
  pulse: 2.0,
  /** 闪烁周期：严重状态 */
  blink: 1.0,
} as const;

/**
 * 缓动函数配置
 * 使用标准的 CSS 缓动曲线
 */
export const EASING = {
  /** 标准缓入缓出 */
  easeInOut: [0.4, 0.0, 0.2, 1],
  /** 缓出：快速开始，慢速结束 */
  easeOut: [0.0, 0.0, 0.2, 1],
  /** 缓入：慢速开始，快速结束 */
  easeIn: [0.4, 0.0, 1, 1],
  /** 线性 */
  linear: [0, 0, 1, 1],
} as const;

/**
 * 弹簧物理配置
 * 用于数值变化动画，提供自然的回弹效果
 */
export const SPRING_CONFIG = {
  /** 默认弹簧：平衡的弹性和阻尼 */
  default: {
    type: "spring" as const,
    stiffness: 100,  // 刚度：值越大越快
    damping: 15,     // 阻尼：值越大回弹越少
    mass: 1,         // 质量：值越大惯性越大
  },
  /** 柔和弹簧：更平滑，回弹更小 */
  gentle: {
    type: "spring" as const,
    stiffness: 80,
    damping: 20,
    mass: 1,
  },
  /** 活泼弹簧：更快，回弹更明显 */
  bouncy: {
    type: "spring" as const,
    stiffness: 150,
    damping: 10,
    mass: 1,
  },
} as const;

// ============================================================================
// 核心动画变体
// ============================================================================

/**
 * 脉冲动画变体
 *
 * 用途：警告状态（warning）的视觉提示
 * 效果：缩放在 1.0 到 1.05 之间循环，透明度在 1.0 到 0.8 之间变化
 * 周期：2 秒
 *
 * 应用场景：
 * - MetricCard 边框警告脉冲
 * - MetricIcon 警告状态
 * - 告警卡片的注意力吸引
 */
export const pulseVariant: Variants = {
  initial: {
    scale: 1,
    opacity: 1,
  },
  animate: {
    scale: [1, 1.05, 1],           // 缩放序列
    opacity: [1, 0.8, 1],          // 透明度序列
    transition: {
      duration: ANIMATION_DURATION.pulse,
      repeat: Infinity,            // 无限循环
      ease: "easeInOut",          // 缓动函数
    },
  },
};

/**
 * 闪烁动画变体
 *
 * 用途：严重状态（critical）的强烈视觉提示
 * 效果：透明度在 1.0 到 0.3 之间快速变化
 * 周期：1 秒（比脉冲快一倍）
 *
 * 应用场景：
 * - MetricCard 严重告警
 * - MetricIcon 严重状态
 * - 紧急事件通知
 */
export const blinkVariant: Variants = {
  initial: {
    opacity: 1,
  },
  animate: {
    opacity: [1, 0.3, 1],          // 透明度序列，变化幅度更大
    transition: {
      duration: ANIMATION_DURATION.blink,
      repeat: Infinity,            // 无限循环
      ease: "linear",             // 线性变化，闪烁更明显
    },
  },
};

/**
 * 数值变化动画变体
 *
 * 用途：监测点数值更新时的平滑过渡
 * 效果：使用弹簧物理模型，提供自然的回弹效果
 *
 * 应用场景：
 * - MetricCard 数值更新
 * - GaugeChart 指针移动
 * - 数字滚动效果
 *
 * 注意：这是一个工厂函数，需要传入目标值
 */
export const createValueChangeVariant = (targetValue: number): Variants => ({
  initial: {
    scale: 1,
  },
  animate: {
    scale: [1, 1.1, 1],            // 轻微放大再恢复，吸引注意
    transition: SPRING_CONFIG.gentle,
  },
});

/**
 * 状态恢复闪光动画变体
 *
 * 用途：从告警状态恢复到正常状态时的视觉反馈
 * 效果：绿色闪光效果，表示问题已解决
 * 持续时间：600ms
 *
 * 应用场景：
 * - critical -> normal 状态切换
 * - warning -> normal 状态切换
 * - 故障恢复通知
 */
export const recoveryFlashVariant: Variants = {
  initial: {
    backgroundColor: 'transparent',
    boxShadow: '0 0 0px rgba(34, 197, 94, 0)',
  },
  flash: {
    backgroundColor: [
      'transparent',
      'rgba(34, 197, 94, 0.2)',    // 绿色半透明
      'transparent',
    ],
    boxShadow: [
      '0 0 0px rgba(34, 197, 94, 0)',
      '0 0 20px rgba(34, 197, 94, 0.6)',
      '0 0 0px rgba(34, 197, 94, 0)',
    ],
    transition: {
      duration: 0.6,
      ease: "easeInOut",
    },
  },
};

/**
 * 淡入动画变体
 *
 * 用途：组件首次加载时的入场动画
 * 效果：从透明到不透明，同时从下方轻微上移
 * 持续时间：300ms
 *
 * 应用场景：
 * - 页面加载时的组件入场
 * - 动态添加的卡片
 * - 模态框显示
 */
export const fadeInVariant: Variants = {
  initial: {
    opacity: 0,
    y: 10,                         // 从下方 10px 开始
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: "easeOut",
    },
  },
};

/**
 * 交错淡入动画变体
 *
 * 用途：多个组件依次入场时使用
 * 效果：子元素依次淡入，产生流畅的视觉效果
 *
 * 应用场景：
 * - 监控墙加载时的 MetricCard 依次显示
 * - 列表项的依次出现
 */
export const staggerContainerVariant: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,        // 每个子元素延迟 50ms
    },
  },
};

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 根据状态获取对应的动画变体
 *
 * @param status - 组件状态
 * @returns 对应的动画变体名称
 */
export const getAnimationVariantForStatus = (
  status: 'normal' | 'warning' | 'critical'
): 'initial' | 'animate' => {
  switch (status) {
    case 'warning':
    case 'critical':
      return 'animate';
    case 'normal':
    default:
      return 'initial';
  }
};

/**
 * 根据状态获取对应的动画变体对象
 *
 * @param status - 组件状态
 * @returns 对应的动画变体对象
 */
export const getVariantForStatus = (
  status: 'normal' | 'warning' | 'critical'
): Variants => {
  switch (status) {
    case 'warning':
      return pulseVariant;
    case 'critical':
      return blinkVariant;
    case 'normal':
    default:
      return fadeInVariant;
  }
};

// ============================================================================
// 过渡配置预设
// ============================================================================

/**
 * 快速过渡：用于颜色、状态变化
 */
export const fastTransition: Transition = {
  duration: ANIMATION_DURATION.fast,
  ease: EASING.easeOut,
};

/**
 * 正常过渡：用于大多数动画
 */
export const normalTransition: Transition = {
  duration: ANIMATION_DURATION.normal,
  ease: EASING.easeInOut,
};

/**
 * 慢速过渡：用于数值变化
 */
export const slowTransition: Transition = {
  duration: ANIMATION_DURATION.slow,
  ease: EASING.easeInOut,
};

/**
 * 弹簧过渡：用于需要回弹效果的动画
 */
export const springTransition: Transition = SPRING_CONFIG.default;
