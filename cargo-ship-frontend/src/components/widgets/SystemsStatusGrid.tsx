/**
 * SystemsStatusGrid 组件 - 全船系统健康矩阵
 * 
 * 功能说明：
 * - 整合展示全船 8 个核心子系统的状态矩阵。
 * - 负责各系统卡片的数据映射和路由导航逻辑。
 * - 采用响应式网格布局，适配大屏指挥中心场景。
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Battery,
    Wind,
    Gauge,
    Zap,
    Settings,
    Droplets,
    Thermometer,
    Cpu
} from 'lucide-react';
import { SystemStatusCard } from './SystemStatusCard';
import { motion } from 'framer-motion';
import { staggerContainerVariant, fadeInVariant } from '../visualization/animations';

// 8 大核心子系统定义
const SHIP_SYSTEMS = [
    { id: 'SYS-BAT-001', name: '电池系统', icon: Battery, metric: 'SOC荷电状态', unit: '%', path: '/monitoring/battery', color: 'cyan' },
    { id: 'SYS-PROP-L-001', name: '左推进电机', icon: Wind, metric: '电机转速', unit: 'rpm', path: '/propulsion', color: 'cyan' },
    { id: 'SYS-PROP-R-001', name: '右推进电机', icon: Wind, metric: '电机转速', unit: 'rpm', path: '/propulsion', color: 'cyan' },
    { id: 'SYS-INV-1-001', name: '1#日用逆变器', icon: Cpu, metric: '输出功率', unit: 'kW', path: '/inverter', color: 'cyan' },
    { id: 'SYS-INV-2-001', name: '2#日用逆变器', icon: Cpu, metric: '输出功率', unit: 'kW', path: '/inverter', color: 'cyan' },
    { id: 'SYS-DCPD-001', name: '直流配电板', icon: Zap, metric: '直流母排电压', unit: 'V', path: '/power-distribution', color: 'cyan' },
    { id: 'SYS-BILGE-001', name: '舱底水系统', icon: Droplets, metric: '1#集水井水位', unit: 'mm', path: '/auxiliary', color: 'cyan' },
    { id: 'SYS-COOL-001', name: '冷却水系统', icon: Thermometer, metric: '冷却水压力', unit: 'MPa', path: '/auxiliary', color: 'cyan' },
];

export const SystemsStatusGrid: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="w-full h-full flex flex-col pt-4">
            {/* 响应式网格布局：铺满页面，增加高度 */}
            <motion.div
                variants={staggerContainerVariant}
                initial="initial"
                animate="animate"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 flex-1"
            >
                {SHIP_SYSTEMS.map((system) => (
                    <motion.div key={system.id} variants={fadeInVariant} className="h-full">
                        <SystemStatusCard
                            systemId={system.id}
                            systemName={system.name}
                            icon={system.icon}
                            iconColor={system.color}
                            primaryMetricName={system.metric}
                            unit={system.unit}
                            onClick={() => navigate(system.path)}
                        />
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
};

export default SystemsStatusGrid;
