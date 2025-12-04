import React,{ useState } from 'react';
import { Eye, Flame, Droplets, AlertTriangle, FileText } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface OperationGuide {
  id: number;
  name: string;
  type: 'fire' | 'leak' | 'fault';
  severity: 'high' | 'medium' | 'low';
  description: string;
  steps: string[];
  warnings: string[];
}

const operationGuides: OperationGuide[] = [
  {
    id: 1,
    name: '电池舱火灾应急处理',
    type: 'fire',
    severity: 'high',
    description: '电池舱发生火灾时的紧急处置程序',
    steps: [
      '立即切断电池舱电源总开关',
      '启动火灾报警系统',
      '关闭电池舱通风系统，防止氧气供应',
      '使用CO2或干粉灭火器进行灭火（禁止使用水）',
      '疏散人员至安全区域',
      '持续监控温度，防止复燃',
      '联系岸基支持和消防部门',
      '记录事故详情',
    ],
    warnings: [
      '严禁使用水或泡沫灭火剂',
      '保持安全距离，防止电池爆炸',
      '穿戴防护装备，防止有毒气体吸入',
      '确认火源完全扑灭后才能恢复通风',
    ],
  },
  {
    id: 2,
    name: '机舱进水应急处理',
    type: 'leak',
    severity: 'high',
    description: '机舱发生进水时的紧急处置程序',
    steps: [
      '立即启动所有舱底水泵',
      '查找进水源并尝试堵漏',
      '关闭进水区域的舱门和水密门',
      '监测水位变化',
      '如水位持续上升，启动应急排水系统',
      '评估船舶稳性，必要时调整压载',
      '通知船长和相关部门',
      '准备应急弃船方案（如需要）',
    ],
    warnings: [
      '优先保护电气设备，防止短路',
      '注意人员安全，避免在积水区域滑倒',
      '定时检查水泵运行状态',
      '保持与驾驶台的通讯畅通',
    ],
  },
  {
    id: 3,
    name: '推进系统故障应急处理',
    type: 'fault',
    severity: 'high',
    description: '推进系统突然失效时的应急处置程序',
    steps: [
      '立即切换至手动控制模式',
      '尝试启动备用推进系统',
      '检查故障代码和报警信息',
      '通知驾驶台，准备应急操舵',
      '检查电源、控制系统和电机连接',
      '如无法恢复，准备锚泊或拖带',
      '联系技术支持进行远程诊断',
      '记录故障现象和处理过程',
    ],
    warnings: [
      '切换操作时注意船舶惯性',
      '检查时确保电源安全',
      '保持与驾驶台的实时通讯',
      '注意周围船舶和障碍物',
    ],
  },
  {
    id: 4,
    name: '电池过热紧急处理',
    type: 'fault',
    severity: 'medium',
    description: '电池温度异常升高时的处置程序',
    steps: [
      '立即降低电池负载',
      '增加冷却系统功率',
      '监测温度变化趋势',
      '检查冷却液循环是否正常',
      '如温度继续上升，准备隔离故障电池组',
      '启动应急冷却方案',
      '记录温度数据和处理措施',
    ],
    warnings: [
      '温度超过55°C时立即降载',
      '准备应急灭火设备',
      '监控是否有烟雾或异味',
      '保持通风良好',
    ],
  },
  {
    id: 5,
    name: '恶劣海况航行操作',
    type: 'fault',
    severity: 'medium',
    description: '遭遇恶劣海况时的安全操作指南',
    steps: [
      '降低航速，避免剧烈颠簸',
      '调整航向，减少横摇和纵摇',
      '加固松散物品，防止移位',
      '检查并关闭所有舱口和水密门',
      '增加值班人员，加强监控',
      '准备应急设备和救生器材',
      '保持与气象部门的联系',
      '必要时寻找避风港',
    ],
    warnings: [
      '注意船舶稳性，防止倾覆',
      '人员活动时做好防护',
      '定时检查设备固定情况',
      '保持足够的安全裕度',
    ],
  },
];

export function ComplexOperationsPage() {
  const [guides, setGuides] = useState<OperationGuide[]>(operationGuides);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [selectedGuide, setSelectedGuide] = useState<OperationGuide | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fire':
        return <Flame className="w-6 h-6 text-red-400" />;
      case 'leak':
        return <Droplets className="w-6 h-6 text-cyan-400" />;
      case 'fault':
        return <AlertTriangle className="w-6 h-6 text-amber-400" />;
      default:
        return <FileText className="w-6 h-6 text-slate-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'fire':
        return '火灾';
      case 'leak':
        return '漏水';
      case 'fault':
        return '设备故障';
      default:
        return '其他';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500">高危</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500">中等</Badge>;
      case 'low':
        return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500">低</Badge>;
      default:
        return null;
    }
  };

  const handleViewGuide = (guide: OperationGuide) => {
    setSelectedGuide(guide);
    setDialogOpen(true);
  };

  const filteredGuides = guides.filter((guide) => {
    const matchesType = filterType === 'all' || guide.type === filterType;
    const matchesSeverity = filterSeverity === 'all' || guide.severity === filterSeverity;
    return matchesType && matchesSeverity;
  });

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <h1 className="text-slate-100">复杂工况操作</h1>

        {/* Filters */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <div className="flex gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48 bg-slate-900/50 border-slate-600 text-slate-100">
                <SelectValue placeholder="工况类型" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-slate-300">全部类型</SelectItem>
                <SelectItem value="fire" className="text-slate-300">火灾</SelectItem>
                <SelectItem value="leak" className="text-slate-300">漏水</SelectItem>
                <SelectItem value="fault" className="text-slate-300">设备故障</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setFilterSeverity('all')}
                className={
                  filterSeverity === 'all'
                    ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                    : 'bg-slate-900/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                全部
              </Button>
              <Button
                size="sm"
                onClick={() => setFilterSeverity('high')}
                className={
                  filterSeverity === 'high'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-slate-900/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                高危
              </Button>
              <Button
                size="sm"
                onClick={() => setFilterSeverity('medium')}
                className={
                  filterSeverity === 'medium'
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-slate-900/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                中等
              </Button>
            </div>
          </div>
        </Card>

        {/* Operation Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGuides.map((guide) => (
            <Card key={guide.id} className="bg-slate-800/80 border-slate-700 p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 bg-slate-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  {getTypeIcon(guide.type)}
                </div>
                <div className="flex-1">
                  <h3 className="text-slate-100 mb-2">{guide.name}</h3>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-slate-700 text-slate-300 border-slate-600 text-xs">
                      {getTypeLabel(guide.type)}
                    </Badge>
                    {getSeverityBadge(guide.severity)}
                  </div>
                </div>
              </div>
              <p className="text-slate-400 text-sm mb-4">{guide.description}</p>
              <Button
                onClick={() => handleViewGuide(guide)}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                <Eye className="w-4 h-4 mr-2" />
                查看指南
              </Button>
            </Card>
          ))}
        </div>

        {/* Guide Details Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-slate-100 flex items-center gap-3">
                {selectedGuide && (
                  <>
                    {getTypeIcon(selectedGuide.type)}
                    {selectedGuide.name}
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedGuide && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <p className="text-slate-500 text-sm mb-1">描述</p>
                  <p className="text-slate-300">{selectedGuide.description}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-sm mb-2">操作步骤</p>
                  <ol className="list-decimal list-inside space-y-2">
                    {selectedGuide.steps.map((step, index) => (
                      <li key={index} className="text-slate-300 text-sm pl-2">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-400 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    安全警告
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedGuide.warnings.map((warning, index) => (
                      <li key={index} className="text-slate-300 text-sm">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
