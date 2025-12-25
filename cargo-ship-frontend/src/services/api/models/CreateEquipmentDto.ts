/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateEquipmentDto = {
    /**
     * 设备编号（唯一标识）
     */
    deviceId: string;
    /**
     * 设备名称
     */
    deviceName: string;
    /**
     * 设备类型
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
     * 安装位置
     */
    location?: string;
    /**
     * 投产日期
     */
    commissionDate?: string;
    /**
     * 设备描述
     */
    description?: string;
    /**
     * 设备状态
     */
    status?: CreateEquipmentDto.status;
};
export namespace CreateEquipmentDto {
    /**
     * 设备状态
     */
    export enum status {
        NORMAL = 'normal',
        WARNING = 'warning',
        FAULT = 'fault',
        OFFLINE = 'offline',
    }
}

