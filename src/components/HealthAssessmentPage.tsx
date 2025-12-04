import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertCircle, AlertTriangle, Info, Eye, Download, RefreshCw, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// 类型定义和服务导入
import {
  HealthReport,                    // 健康报告实体
  HealthMetric,                    // 健康指标
  EquipmentHealthStatus,           // 设备健康状态
  ReportType,                      // 报告类型
  ReportFormat,                    // 报告格式枚举
} from '../types/health';
import { healthService } from '../services/health-service';  // 健康评估服务
import { GaugeChart } from './GaugeChart';  // 仪表盘图表组件

// 生成Mock数据的辅助函数
const generateMockSOHData = () => {
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月'];
  return months.map((month, index) => ({
    time: month,
    soh: Math.max(85, 98 - index * 1.2 + (Math.random() * 2 - 1)), // 模拟SOH趋势
  }));
};

const generateMockHealthData = () => {
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月'];
  return months.map((month, index) => ({
    time: month,
    health: Math.max(80, 95 - index * 1.0 + (Math.random() * 3 - 1.5)), // 模拟健康趋势
  }));
};

// 设备健康列表模拟数据
const mockDeviceHealthList = [
  {
    id: 'battery-001',
    name: '电池系统',
    score: 92,
    status: 'healthy' as EquipmentHealthStatus,
    lastAssessment: '2025-11-20 08:00:00',
  },
  {
    id: 'propulsion-001',
    name: '推进系统',
    score: 85,
    status: 'warning' as EquipmentHealthStatus,
    lastAssessment: '2025-11-20 07:55:00',
  },
  {
    id: 'inverter-001',
    name: '逆变器系统',
    score: 88,
    status: 'healthy' as EquipmentHealthStatus,
    lastAssessment: '2025-11-20 07:50:00',
  },
  {
    id: 'aux-001',
    name: '辅助设备',
    score: 95,
    status: 'healthy' as EquipmentHealthStatus,
    lastAssessment: '2025-11-20 07:45:00',
  },
  {
    id: 'cooling-001',
    name: '冷却系统',
    score: 65,
    status: 'critical' as EquipmentHealthStatus,
    lastAssessment: '2025-11-20 07:40:00',
  },
];

// 故障诊断模拟数据
const mockFaultDiagnostics = [
  {
    id: 1,
    timestamp: '2025-11-20 07:23:15',
    device: '电池系统',
    description: '电池温度过高：左串1，模块3',
    severity: 3,
    recommendation: '立即启动冷却系统，降低负载',
  },
  {
    id: 2,
    timestamp: '2025-11-20 06:45:22',
    device: '推进系统',
    description: '推进系统效率下降15%',
    severity: 2,
    recommendation: '检查电机轴承润滑状态',
  },
  {
    id: 3,
    timestamp: '2025-11-20 05:30:10',
    device: '冷却系统',
    description: '冷却液流量低于正常值',
    severity: 2,
    recommendation: '检查冷却泵和管路',
  },
  {
    id: 4,
    timestamp: '2025-11-20 04:15:45',
    device: '逆变器系统',
    description: '1#逆变器电压波动',
    severity: 1,
    recommendation: '监控电压稳定性，必要时降低负载',
  },
  {
    id: 5,
    timestamp: '2025-11-20 03:00:00',
    device: '电池系统',
    description: 'SOC低于20%',
    severity: 1,
    recommendation: '安排充电计划',
  },
];

/**
 * 健康评估页面组件
 *
 * 功能说明：
 * - 显示设备健康评估报告和仪表板
 * - 支持实时健康数据监控和历史趋势分析
 * - 提供设备健康列表和故障诊断信息
 * - 集成健康评估API服务
 * - 支持报告生成和导出功能
 *
 * 数据来源：
 * - 实时健康数据：通过 healthService API 获取
 * - 历史趋势数据：从后端历史数据查询
 * - 故障诊断：集成告警系统数据
 *
 * @returns {React.ReactElement} 健康评估页面组件
 */
export function HealthAssessmentPage() {
  // 组件状态管理
  const [loading, setLoading] = useState(false);         // 加载状态
  const [error, setError] = useState<string | null>(null); // 错误状态
  const [refreshing, setRefreshing] = useState(false);   // 刷新状态
  const [overallHealthScore, setOverallHealthScore] = useState(92); // 整体健康评分
  
  // 使用健康评估服务
  const [currentReport, setCurrentReport] = useState<HealthReport | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string>('battery-001');

  // 加载设备健康数据
  const loadEquipmentHealth = async (equipmentId: string) => {
    setLoading(true);
    setError(null);
    try {
      // 调用健康评估API获取设备健康报告
      const report = await healthService.getEquipmentHealth(equipmentId, {
        reportType: 'DAILY',
        startDate: '2025-11-01',
        endDate: '2025-11-20'
      });
      setCurrentReport(report);
      return report;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取设备健康数据失败';
      setError(errorMessage);
      console.error('Health assessment error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 生成健康报告
  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await healthService.generateReport({
        equipmentId: selectedEquipment,
        reportType: 'WEEKLY',
        startDate: '2025-11-14',
        endDate: '2025-11-20'
      });
      console.log(`报告生成请求已提交: ${result.reportId}`);
      // 刷新数据
      await loadEquipmentHealth(selectedEquipment);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '生成健康报告失败';
      setError(errorMessage);
      console.error('Report generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 导出报告
  const handleExportReport = async (reportId: string) => {
    try {
      const exportResult = await healthService.exportReport(reportId, ReportFormat.PDF, {
        includeCharts: true,
        includeRecommendations: true
      });
      // 下载报告文件
      window.open(exportResult.downloadUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '导出报告失败';
      setError(errorMessage);
      console.error('Export error:', err);
    }
  };

  // 刷新数据
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadEquipmentHealth(selectedEquipment);
    } finally {
      setRefreshing(false);
    }
  };

  // 组件初始化加载数据
  useEffect(() => {
    loadEquipmentHealth(selectedEquipment);
  }, [selectedEquipment]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500">正常</Badge>;
      case 'warning':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500">警告</Badge>;
      case 'critical':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500">严重</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500">未知</Badge>;
    }
  };

  const getSeverityIcon = (severity: number) => {
    switch (severity) {
      case 3:
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 2:
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      default:
        return <Info className="w-5 h-5 text-cyan-400" />;
    }
  };

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 3:
        return 'text-red-400';
      case 2:
        return 'text-amber-400';
      default:
        return 'text-cyan-400';
    }
  };

  const getScoreStatus = (score: number): 'normal' | 'warning' | 'critical' => {
    if (score >= 80) return 'normal';
    if (score >= 60) return 'warning';
    return 'critical';
  };

  // 生成图表数据
  const batterySOHData = generateMockSOHData();
  const propulsionHealthData = generateMockHealthData();

  // 使用模拟数据（在真实环境中将从API获取）
  const deviceHealthList = mockDeviceHealthList;
  const faultDiagnostics = mockFaultDiagnostics;

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 错误提示区域 */}
        {error && (
          <Card className="bg-red-900/20 border-red-700 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <div>
                <h4 className="text-red-400 font-medium">健康评估错误</h4>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setError(null)}
                className="ml-auto text-red-400 border-red-600 hover:bg-red-800"
              >
                关闭
              </Button>
            </div>
          </Card>
        )}
        
        {/* 加载状态指示 */}
        {loading && (
          <Card className="bg-blue-900/20 border-blue-700 p-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
              <div>
                <h4 className="text-blue-400 font-medium">正在加载健康数据...</h4>
                <p className="text-blue-300 text-sm">请稍候，正在获取设备健康评估报告</p>
              </div>
            </div>
          </Card>
        )}

        {/* Top Row - Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overall System Health Score */}
          <Card className="bg-slate-800/80 border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-slate-100">整体系统健康评分</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-slate-300 border-slate-600 hover:bg-slate-700"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                刷新
              </Button>
            </div>
            <div className="flex justify-center">
              <GaugeChart value={overallHealthScore} maxValue={100} label="" unit="%" size="large" status="normal" />
            </div>
          </Card>

          {/* Battery SOH Trend */}
          <Card className="bg-slate-800/80 border-slate-700 p-6">
            <h3 className="text-slate-100 mb-6">电池SOH趋势</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={batterySOHData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" domain={[85, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '0.5rem',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="soh"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name="SOH (%)"
                  dot={{ fill: '#22c55e', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Propulsion Health Trend */}
          <Card className="bg-slate-800/80 border-slate-700 p-6">
            <h3 className="text-slate-100 mb-6">推进健康指数趋势</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={propulsionHealthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" domain={[80, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '0.5rem',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="health"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name="健康指数"
                  dot={{ fill: '#22c55e', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Device Health List */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <h3 className="text-slate-100 mb-6">设备健康列表</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">设备名称</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">整体健康评分</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">上次评估时间</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">状态</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">操作</th>
                </tr>
              </thead>
              <tbody>
                {deviceHealthList.map((device) => (
                  <tr key={device.id} className="border-b border-slate-700/50 hover:bg-slate-900/30">
                    <td className="py-3 px-3 text-slate-300 text-sm">{device.name}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm ${
                            device.score >= 80
                              ? 'text-green-400'
                              : device.score >= 60
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}
                        >
                          {device.score}%
                        </span>
                        <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              device.score >= 80
                                ? 'bg-green-500'
                                : device.score >= 60
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${device.score}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-sm">{device.lastAssessment}</td>
                    <td className="py-3 px-3">{getStatusBadge(device.status)}</td>
                    <td className="py-3 px-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-cyan-500 hover:bg-cyan-600 text-white"
                          onClick={() => {
                            setSelectedEquipment(device.id);
                            loadEquipmentHealth(device.id);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          详情
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-slate-300 border-slate-600 hover:bg-slate-700"
                          onClick={() => handleExportReport(device.id)}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* 生成报告按钮 */}
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleGenerateReport}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-3 h-3 mr-1" />
              {loading ? '生成中...' : '生成新报告'}
            </Button>
          </div>
        </Card>

        {/* Recent Fault Diagnostics */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <h3 className="text-slate-100 mb-6">近期故障诊断与警告</h3>
          <div className="space-y-3">
            {faultDiagnostics.map((fault) => (
              <div
                key={fault.id}
                className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {getSeverityIcon(fault.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-slate-300">{fault.device}</span>
                      <Badge
                        className={`text-xs ${
                          fault.severity === 3
                            ? 'bg-red-500/20 text-red-400 border-red-500'
                            : fault.severity === 2
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                            : 'bg-cyan-500/20 text-cyan-400 border-cyan-500'
                        }`}
                      >
                        {fault.severity === 3 ? '3级严重' : fault.severity === 2 ? '2级警告' : '1级提示'}
                      </Badge>
                    </div>
                    <p className={`${getSeverityColor(fault.severity)} mb-2`}>
                      {fault.description}
                    </p>
                    <p className="text-slate-400 text-sm mb-1">
                      <span className="text-slate-500">建议操作：</span>
                      {fault.recommendation}
                    </p>
                    <p className="text-slate-500 text-xs">{fault.timestamp}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
