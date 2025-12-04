import React,{ useState } from 'react';
import { Eye, Lightbulb, TrendingUp, Shield, MapPin } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface Suggestion {
  id: number;
  title: string;
  description: string;
  type: 'energy' | 'fault' | 'route';
  priority: 'high' | 'medium' | 'low';
  details: string[];
  expectedBenefit: string;
}

const mockSuggestions: Suggestion[] = [
  {
    id: 1,
    title: '优化巡航速度以提高能效',
    description: '根据当前航线和海况，建议将巡航速度从18节降至16节',
    type: 'energy',
    priority: 'high',
    details: [
      '当前巡航速度: 18节',
      '建议巡航速度: 16节',
      '预计能耗降低: 15%',
      '航行时间增加: 约20分钟',
      '综合经济效益: 提升12%',
    ],
    expectedBenefit: '预计节约能耗15%，每日节省约500kWh',
  },
  {
    id: 2,
    title: '冷却系统维护提醒',
    description: '冷却系统效率持续下降，建议在72小时内进行检修',
    type: 'fault',
    priority: 'high',
    details: [
      '当前冷却效率: 65%',
      '正常效率范围: 85-95%',
      '问题原因分析: 可能是热交换器积垢',
      '建议措施: 清洁热交换器，检查冷却液循环',
      '预计维护时间: 4小时',
    ],
    expectedBenefit: '避免系统过热导致的停机风险',
  },
  {
    id: 3,
    title: '推进电机轴承润滑优化',
    description: '左推进电机轴承温度偏高，建议调整润滑周期',
    type: 'fault',
    priority: 'medium',
    details: [
      '当前轴承温度: 68°C',
      '正常温度范围: 45-60°C',
      '建议措施: 提前进行润滑保养',
      '当前润滑周期: 200小时',
      '建议润滑周期: 150小时',
    ],
    expectedBenefit: '延长轴承寿命，避免突发故障',
  },
  {
    id: 4,
    title: '电池充电策略优化',
    description: '建议调整充电时间以利用低谷电价',
    type: 'energy',
    priority: 'medium',
    details: [
      '当前充电时段: 14:00-18:00',
      '建议充电时段: 22:00-02:00',
      '低谷电价时段: 22:00-06:00',
      '预计电费节省: 25%',
      'SOC管理: 保持在20-90%范围',
    ],
    expectedBenefit: '每月节省电费约3000元',
  },
  {
    id: 5,
    title: '备用航线建议',
    description: '前方海域天气恶化，建议考虑备用航线',
    type: 'route',
    priority: 'low',
    details: [
      '当前航线: A路线',
      '备用航线: B路线',
      '距离差异: +15海里',
      '预计时间差异: +30分钟',
      '安全评估: 风险降低40%',
    ],
    expectedBenefit: '提高航行安全性，避免恶劣天气',
  },
];

export function DecisionSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>(mockSuggestions);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'energy':
        return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'fault':
        return <Shield className="w-5 h-5 text-amber-400" />;
      case 'route':
        return <MapPin className="w-5 h-5 text-cyan-400" />;
      default:
        return <Lightbulb className="w-5 h-5 text-slate-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'energy':
        return '能耗优化';
      case 'fault':
        return '故障预防';
      case 'route':
        return '航线规划';
      default:
        return '其他';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500">高优先级</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500">中优先级</Badge>;
      case 'low':
        return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500">低优先级</Badge>;
      default:
        return null;
    }
  };

  const handleViewDetails = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setDialogOpen(true);
  };

  const filteredSuggestions = suggestions.filter((suggestion) => {
    const matchesType = filterType === 'all' || suggestion.type === filterType;
    const matchesPriority = filterPriority === 'all' || suggestion.priority === filterPriority;
    return matchesType && matchesPriority;
  });

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <h1 className="text-slate-100">决策建议</h1>

        {/* Filters */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <div className="flex gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48 bg-slate-900/50 border-slate-600 text-slate-100">
                <SelectValue placeholder="建议类型" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-slate-300">全部类型</SelectItem>
                <SelectItem value="energy" className="text-slate-300">能耗优化</SelectItem>
                <SelectItem value="fault" className="text-slate-300">故障预防</SelectItem>
                <SelectItem value="route" className="text-slate-300">航线规划</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setFilterPriority('all')}
                className={
                  filterPriority === 'all'
                    ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                    : 'bg-slate-900/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                全部
              </Button>
              <Button
                size="sm"
                onClick={() => setFilterPriority('high')}
                className={
                  filterPriority === 'high'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-slate-900/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                高优先级
              </Button>
              <Button
                size="sm"
                onClick={() => setFilterPriority('medium')}
                className={
                  filterPriority === 'medium'
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-slate-900/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                中优先级
              </Button>
              <Button
                size="sm"
                onClick={() => setFilterPriority('low')}
                className={
                  filterPriority === 'low'
                    ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                    : 'bg-slate-900/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                低优先级
              </Button>
            </div>
          </div>
        </Card>

        {/* Suggestions List */}
        <div className="space-y-4">
          {filteredSuggestions.map((suggestion) => (
            <Card key={suggestion.id} className="bg-slate-800/80 border-slate-700 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  {getTypeIcon(suggestion.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-slate-100 mb-1">{suggestion.title}</h3>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-slate-700 text-slate-300 border-slate-600 text-xs">
                          {getTypeLabel(suggestion.type)}
                        </Badge>
                        {getPriorityBadge(suggestion.priority)}
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-400 mb-3">{suggestion.description}</p>
                  <p className="text-green-400 text-sm mb-3">
                    <span className="text-slate-500">预期效益:</span> {suggestion.expectedBenefit}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleViewDetails(suggestion)}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    查看详情
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Details Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
            <DialogHeader>
              <DialogTitle className="text-slate-100">建议详情</DialogTitle>
            </DialogHeader>
            {selectedSuggestion && (
              <div className="space-y-4">
                <div>
                  <p className="text-slate-500 text-sm mb-1">建议标题</p>
                  <p className="text-slate-100">{selectedSuggestion.title}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-sm mb-1">详细信息</p>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedSuggestion.details.map((detail, index) => (
                      <li key={index} className="text-slate-300 text-sm">
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-slate-500 text-sm mb-1">预期效益</p>
                  <p className="text-green-400">{selectedSuggestion.expectedBenefit}</p>
                </div>
                <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white">
                  采纳建议
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
