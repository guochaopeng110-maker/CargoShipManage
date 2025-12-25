'use client';

import * as React from 'react';
import { Search, Loader2, RotateCcw } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DateRangePicker } from '../ui/date-range-picker';
import { Label } from '../ui/label';
import { useEquipmentStore } from '../../stores/equipment-store';

/**
 * 组件属性接口
 */
interface AlarmFiltersProps {
  /** 查询是否正在加载 */
  loading?: boolean;
  /** 查询回调 */
  onQuery: (filters: {
    deviceId: string;
    dateRange: DateRange | undefined;
  }) => void;
}

/**
 * 告警筛选条件组件
 *
 * 功能特性：
 * - 动态设备选择（从 store 获取）
 * - 日期范围选择
 * - 简化的查询接口
 */
export function AlarmFilters({ loading = false, onQuery }: AlarmFiltersProps) {
  // ===== Store 状态 =====
  const equipmentList = useEquipmentStore(state => state.items);
  const fetchEquipmentList = useEquipmentStore(state => state.fetchEquipmentList);

  // ===== 本地状态 =====
  const [selectedDevice, setSelectedDevice] = React.useState<string>('');
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();

  // 组件挂载时获取设备列表
  React.useEffect(() => {
    // 获取前100个设备，足以覆盖核心设备
    fetchEquipmentList({ page: 1, pageSize: 100 });
  }, [fetchEquipmentList]);

  /**
   * 执行查询
   * 将 UI 状态转换为查询参数并调用回调
   */
  const handleExecuteQuery = () => {
    // 基本验证：至少需要选择设备
    if (!selectedDevice) {
      return;
    }

    onQuery({
      deviceId: selectedDevice,
      dateRange,
    });
  };

  /**
   * 重置所有筛选条件
   */
  const handleReset = () => {
    setSelectedDevice('');
    setDateRange(undefined);
  };

  /**
   * 快捷日期选项
   */
  const setQuickDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setDateRange({ from: start, to: end });
  };

  return (
    <Card className="bg-slate-800/80 border-slate-700 p-6">
      <div className="space-y-6">
        {/* 设备选择 */}
        <div className="space-y-2">
          <Label className="text-slate-300 text-sm mb-2 block font-medium">选择设备</Label>
          <Select value={selectedDevice} onValueChange={setSelectedDevice}>
            <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
              <SelectValue placeholder="请选择设备" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {equipmentList.map((equipment) => (
                <SelectItem key={equipment.id} value={equipment.id} className="text-slate-300">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs opacity-50">[{equipment.deviceId}]</span>
                    <span>{equipment.deviceName}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 日期范围选择 */}
        <div className="space-y-2">
          <Label className="text-slate-300 text-sm mb-2 block font-medium">日期范围</Label>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            placeholder="选择日期范围"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickDateRange(7)}
              className="bg-slate-900/50 border-slate-600 text-slate-400 hover:bg-slate-700"
            >
              最近7天
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickDateRange(30)}
              className="bg-slate-900/50 border-slate-600 text-slate-400 hover:bg-slate-700"
            >
              最近30天
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickDateRange(90)}
              className="bg-slate-900/50 border-slate-600 text-slate-400 hover:bg-slate-700"
            >
              最近90天
            </Button>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleExecuteQuery}
            disabled={loading || !selectedDevice}
            className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white border-none"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                查询中...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                执行查询
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={loading}
            className="bg-slate-900/50 border-slate-600 text-slate-400 hover:bg-slate-700"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            重置
          </Button>
        </div>
      </div>
    </Card>
  );
}
