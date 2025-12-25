/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Equipment = {
    /**
     * 设备唯一ID（UUID格式）
     */
    id: string;
    /**
     * 设备编号（唯一标识，系统级唯一）
     */
    deviceId: string;
    /**
     * 设备名称
     */
    deviceName: string;
    /**
     * 设备类型（如推进电机、发电机、电池系统等）
     */
    deviceType: string;
    /**
     * 设备型号
     */
    model?: string;
    /**
     * 制造商
     */
    manufacturer?: string;
    /**
     * 安装位置（如机舱左侧、甲板中央等）
     */
    location?: string;
    /**
     * 设备当前运行状态
     */
    status: Equipment.status;
    /**
     * 投产日期
     */
    commissionDate?: string;
    /**
     * 设备详细描述
     */
    description?: string;
    /**
     * 记录创建时间
     */
    createdAt: string;
    /**
     * 记录更新时间
     */
    updatedAt: string;
    /**
     * 软删除时间（非空表示该设备已被删除）
     */
    deletedAt?: string;
};
export namespace Equipment {
    /**
     * 设备当前运行状态
     */
    export enum status {
        NORMAL = 'normal',
        WARNING = 'warning',
        FAULT = 'fault',
        OFFLINE = 'offline',
    }
}

