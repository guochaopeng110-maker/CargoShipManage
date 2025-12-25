export interface AlarmPushPayload {
    id: string;
    equipmentId: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    severityText?: string;
    metricType?: string;
    abnormalValue?: number;
    thresholdRange?: string;
    triggeredAt: string;
    status: 'pending' | 'processing' | 'resolved' | 'ignored';
    statusText?: string;
    timestamp: string;
    monitoringPoint: string;
    faultName: string;
    recommendedAction?: string;
    handler?: string | null;
    handledAt?: string | null;
    handleNote?: string | null;
    buffered?: boolean;
}

export interface AlarmBatchPayload {
    alarms: AlarmPushPayload[];
    count: number;
}

export interface AlarmTrendPayload {
    equipmentId: string;
    period: string; // e.g., '7d'
    totalAlarms: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    trend: 'increasing' | 'stable' | 'decreasing';
}

export interface MonitoringDataPayload {
    id: number;
    equipmentId: string;
    timestamp: string;
    metricType: string; // e.g. 'voltage', 'current', etc.
    monitoringPoint: string;
    value: number;
    unit: string;
    quality: 'normal' | 'abnormal' | 'suspicious';
    source: 'sensor-upload' | 'manual-entry' | 'file-import';
}

/**
 * 批量监测数据项接口
 */
export interface MonitoringDataItem {
    id: number;                // 数据库记录ID
    timestamp: string;         // 时间戳 (ISO 8601格式)
    metricType: string;        // 指标类型 (voltage, temperature, pressure等)
    monitoringPoint: string | null; // 监测点名称
    value: number;             // 指标数值
    unit: string;              // 单位
    quality: number;           // 数据质量 (192=正常, 其他值表示异常)
    source: string;            // 数据来源
}

/**
 * 批量监测数据推送消息格式
 */
export interface MonitoringBatchDataMessage {
    batchId: string;           // 批次唯一标识 (UUID)
    equipmentId: string;       // 设备业务编号
    data: MonitoringDataItem[]; // 监测数据数组
    chunkIndex: number;        // 当前分片序号 (从1开始)
    totalChunks: number;       // 总分片数
    isHistory: boolean;        // 是否为历史数据 (true=文件导入, false=实时上报)
}

export interface EquipmentHealthUpdatePayload {
    equipmentId: string;
    score: number;
    grade: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
    gradeText?: string;
    soh: number;
    trend: 'improving' | 'stable' | 'declining';
    calculatedAt: string;
    timestamp: string;
}

export interface ConnectedPayload {
    message: string;
    userId: string;
    username: string;
    timestamp: string;
}

export interface SubscribeEquipmentResponse {
    success: boolean;
    message: string;
    room: string;
}

export interface UnsubscribeEquipmentResponse {
    success: boolean;
    message: string;
}

export interface PingResponse {
    event: 'pong';
    data: {
        timestamp: number;
    };
}

// 服务端到客户端的事件 (监听)
export interface ServerToClientEvents {
    'connected': (data: ConnectedPayload) => void;
    'alarm:push': (data: AlarmPushPayload) => void;
    'alarm:batch': (data: AlarmBatchPayload) => void;
    'alarm:trend': (data: AlarmTrendPayload) => void;
    'monitoring:new-data': (data: MonitoringDataPayload) => void;
    'monitoring:batch-data': (data: MonitoringBatchDataMessage) => void;
    'equipment:health:update': (data: EquipmentHealthUpdatePayload) => void;
    'equipment:health:warning': (data: EquipmentHealthUpdatePayload) => void;
    'connect_error': (error: Error) => void;
    'disconnect': (reason: string) => void;
}

// 客户端到服务端的事件 (发送)
export interface ClientToServerEvents {
    'subscribe:equipment': (data: { equipmentId: string }, callback?: (res: SubscribeEquipmentResponse) => void) => void;
    'unsubscribe:equipment': (data: { equipmentId: string }, callback?: (res: UnsubscribeEquipmentResponse) => void) => void;
    'ping': (callback: (res: PingResponse) => void) => void;
}
