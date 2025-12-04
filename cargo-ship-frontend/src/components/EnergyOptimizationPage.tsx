import React,{ useState } from 'react';
import { CheckCircle, TrendingDown } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Mock energy consumption trend data
const energyTrendData = [
  { time: '1月', consumption: 12500 },
  { time: '2月', consumption: 11800 },
  { time: '3月', consumption: 13200 },
  { time: '4月', consumption: 12900 },
  { time: '5月', consumption: 12100 },
  { time: '6月', consumption: 11500 },
  { time: '7月', consumption: 11200 },
  { time: '8月', consumption: 10800 },
  { time: '9月', consumption: 10500 },
  { time: '10月', consumption: 10200 },
  { time: '11月', consumption: 9800 },
];

// Mock energy distribution data
const energyDistributionData = [
  { name: '推进系统', value: 45, color: '#06b6d4' },
  { name: '电池管理', value: 25, color: '#8b5cf6' },
  { name: '逆变器', value: 15, color: '#22c55e' },
  { name: '冷却系统', value: 10, color: '#f59e0b' },
  { name: '辅助设备', value: 5, color: '#ec4899' },
];

interface OptimizationSuggestion {
  id: number;
  title: string;
  description: string;
  expectedSaving: string;
  steps: string[];
  implemented: boolean;
}

const optimizationSuggestions: OptimizationSuggestion[] = [
  {
    id: 1,
    title: '调整航速优化',
    description: '根据航程和时间要求，动态调整航速以达到最优能耗',
    expectedSaving: '节约15%能耗',
    steps: [
      '分析航程和时间要求',
      '计算最优航速曲线',
      '自动调整推进功率',
      '实时监控能耗变化',
    ],
    implemented: false,
  },
  {
    id: 2,
    title: '优化设备运行模式',
    description: '根据负载情况智能启停辅助设备，避免空转浪费',
    expectedSaving: '节约8%能耗',
    steps: [
      '监测设备实时负载',
      '识别低效运行设备',
      '自动调整设备工作模式',
      '记录优化效果',
    ],
    implemented: false,
  },
  {
    id: 3,
    title: '电池充放电策略优化',
    description: '优化电池充放电曲线，延长电池寿命并提高效率',
    expectedSaving: '节约10%能耗，延长电池寿命20%',
    steps: [
      '分析历史充放电数据',
      '优化充电时段',
      '调整放电深度',
      '实施智能平衡策略',
    ],
    implemented: false,
  },
  {
    id: 4,
    title: '冷却系统智能控制',
    description: '根据温度实时调整冷却功率，避免过度冷却',
    expectedSaving: '节约12%冷却系统能耗',
    steps: [
      '安装温度传感器网络',
      '建立温度预测模型',
      '实施变频控制',
      '优化冷却液流量',
    ],
    implemented: false,
  },
];

export function EnergyOptimizationPage() {
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>(optimizationSuggestions);

  const handleAdoptSuggestion = (id: number) => {
    setSuggestions(
      suggestions.map((s) => (s.id === id ? { ...s, implemented: true } : s))
    );
    alert('优化建议已采纳，系统正在应用优化参数...');
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <h1 className="text-slate-100">能效优化</h1>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Energy Consumption Trend */}
          <Card className="bg-slate-800/80 border-slate-700 p-6">
            <h3 className="text-slate-100 mb-6">历史能耗趋势</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={energyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '0.5rem',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="consumption"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  name="能耗 (kWh)"
                  dot={{ fill: '#06b6d4', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center justify-center gap-2 text-green-400">
              <TrendingDown className="w-5 h-5" />
              <span className="text-sm">相比上月降低21%</span>
            </div>
          </Card>

          {/* Energy Distribution */}
          <Card className="bg-slate-800/80 border-slate-700 p-6">
            <h3 className="text-slate-100 mb-6">当前能耗分布</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={energyDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {energyDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '0.5rem',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Optimization Suggestions */}
        <div>
          <h2 className="text-slate-100 mb-4">优化建议</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {suggestions.map((suggestion) => (
              <Card
                key={suggestion.id}
                className={`bg-slate-800/80 border-slate-700 p-6 ${
                  suggestion.implemented ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-slate-100">{suggestion.title}</h3>
                  {suggestion.implemented && (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  )}
                </div>
                <p className="text-slate-400 text-sm mb-3">{suggestion.description}</p>
                <p className="text-green-400 mb-4">
                  <span className="text-slate-500 text-sm">预期节约:</span> {suggestion.expectedSaving}
                </p>
                <div className="mb-4">
                  <p className="text-slate-500 text-sm mb-2">操作步骤:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    {suggestion.steps.map((step, index) => (
                      <li key={index} className="text-slate-300 text-sm">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
                <Button
                  onClick={() => handleAdoptSuggestion(suggestion.id)}
                  disabled={suggestion.implemented}
                  className={
                    suggestion.implemented
                      ? 'w-full bg-green-500/20 text-green-400 cursor-not-allowed'
                      : 'w-full bg-cyan-500 hover:bg-cyan-600 text-white'
                  }
                >
                  {suggestion.implemented ? '已采纳' : '采纳建议'}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
