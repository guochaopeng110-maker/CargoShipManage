# MySQL分区管理脚本 (PowerShell版本)
#
# 功能：
# 1. 自动为time_series_data表添加未来月份的分区
# 2. 删除过期的历史分区（可选）
# 3. 检查和报告分区状态
#
# 使用方法：
# .\manage-partitions.ps1 -Action add -Months 6       # 添加未来6个月的分区
# .\manage-partitions.ps1 -Action remove -Months 24   # 删除24个月前的分区
# .\manage-partitions.ps1 -Action status              # 查看分区状态
#
# 建议：
# 将此脚本添加到Windows任务计划程序，每月自动执行一次

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("add", "remove", "status")]
    [string]$Action,

    [Parameter(Mandatory=$false)]
    [int]$Months = 0,

    [Parameter(Mandatory=$false)]
    [string]$DBHost = "localhost",

    [Parameter(Mandatory=$false)]
    [int]$DBPort = 3306,

    [Parameter(Mandatory=$false)]
    [string]$DBUser = "root",

    [Parameter(Mandatory=$false)]
    [string]$DBPassword = "",

    [Parameter(Mandatory=$false)]
    [string]$DBName = "cargo_ships_db"
)

# 日志函数
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# MySQL连接测试
function Test-MySQLConnection {
    Write-Info "测试数据库连接..."

    $mysqlPath = "mysql"

    # 构建连接参数
    $connectionArgs = @(
        "-h$DBHost",
        "-P$DBPort",
        "-u$DBUser"
    )

    if ($DBPassword) {
        $connectionArgs += "-p$DBPassword"
    }

    $connectionArgs += "-e", "SELECT 1"

    try {
        $result = & $mysqlPath $connectionArgs 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Info "数据库连接成功"
            return $true
        } else {
            Write-Error-Custom "无法连接到MySQL数据库: $result"
            return $false
        }
    } catch {
        Write-Error-Custom "MySQL命令未找到，请确保MySQL客户端已安装并添加到PATH"
        return $false
    }
}

# 执行MySQL查询
function Invoke-MySQLQuery {
    param(
        [string]$Query,
        [switch]$NoOutput
    )

    $mysqlPath = "mysql"
    $connectionArgs = @(
        "-h$DBHost",
        "-P$DBPort",
        "-u$DBUser"
    )

    if ($DBPassword) {
        $connectionArgs += "-p$DBPassword"
    }

    $connectionArgs += "-D$DBName", "-N", "-e", $Query

    try {
        $result = & $mysqlPath $connectionArgs 2>&1
        if ($LASTEXITCODE -eq 0) {
            if (-not $NoOutput) {
                return $result
            }
            return $true
        } else {
            Write-Error-Custom "查询执行失败: $result"
            return $false
        }
    } catch {
        Write-Error-Custom "查询执行异常: $_"
        return $false
    }
}

# 添加未来分区
function Add-FuturePartitions {
    param([int]$MonthsCount)

    Write-Info "开始添加未来 $MonthsCount 个月的分区..."

    for ($i = 1; $i -le $MonthsCount; $i++) {
        # 计算未来月份
        $targetDate = (Get-Date).AddMonths($i)
        $year = $targetDate.ToString("yyyy")
        $month = $targetDate.ToString("MM")
        $nextMonth = $targetDate.AddMonths(1).ToString("yyyyMM")
        $partitionName = "p$year$month"
        $partitionValue = $nextMonth

        # 检查分区是否已存在
        $checkQuery = @"
SELECT COUNT(*) FROM INFORMATION_SCHEMA.PARTITIONS
WHERE TABLE_SCHEMA='$DBName' AND TABLE_NAME='time_series_data' AND PARTITION_NAME='$partitionName'
"@

        $exists = Invoke-MySQLQuery -Query $checkQuery

        if ($exists -eq "0") {
            # 添加分区（在p_future之前）
            Write-Info "添加分区: $partitionName (VALUES LESS THAN $partitionValue)"

            $addQuery = @"
ALTER TABLE time_series_data REORGANIZE PARTITION p_future INTO (
    PARTITION $partitionName VALUES LESS THAN ($partitionValue) COMMENT = '${year}年${month}月分区',
    PARTITION p_future VALUES LESS THAN MAXVALUE COMMENT = '未来数据分区'
)
"@

            $result = Invoke-MySQLQuery -Query $addQuery -NoOutput

            if ($result) {
                Write-Info "✓ 分区 $partitionName 添加成功"
            } else {
                Write-Error-Custom "✗ 分区 $partitionName 添加失败"
            }
        } else {
            Write-Warn "分区 $partitionName 已存在，跳过"
        }
    }

    Write-Info "分区添加完成"
}

# 删除过期分区
function Remove-OldPartitions {
    param([int]$MonthsAgo)

    Write-Info "开始删除 $MonthsAgo 个月前的分区..."

    # 计算截止日期
    $cutoffDate = (Get-Date).AddMonths(-$MonthsAgo).ToString("yyyyMM")

    # 获取所有分区
    $partitionsQuery = @"
SELECT PARTITION_NAME FROM INFORMATION_SCHEMA.PARTITIONS
WHERE TABLE_SCHEMA='$DBName' AND TABLE_NAME='time_series_data' AND PARTITION_NAME LIKE 'p20%'
ORDER BY PARTITION_NAME
"@

    $partitions = Invoke-MySQLQuery -Query $partitionsQuery

    if ($partitions) {
        $partitionList = $partitions -split "`n"

        foreach ($partition in $partitionList) {
            $partition = $partition.Trim()

            # 跳过p_future分区
            if ($partition -eq "p_future" -or [string]::IsNullOrEmpty($partition)) {
                continue
            }

            # 提取分区的年月（格式：p202511 -> 202511）
            $partitionDate = $partition.Substring(1)

            # 比较日期
            if ([int]$partitionDate -lt [int]$cutoffDate) {
                Write-Warn "删除过期分区: $partition ($($partitionDate.Substring(0,4))年$($partitionDate.Substring(4,2))月)"

                $dropQuery = "ALTER TABLE time_series_data DROP PARTITION $partition"
                $result = Invoke-MySQLQuery -Query $dropQuery -NoOutput

                if ($result) {
                    Write-Info "✓ 分区 $partition 删除成功"
                } else {
                    Write-Error-Custom "✗ 分区 $partition 删除失败"
                }
            }
        }
    }

    Write-Info "分区删除完成"
}

# 查看分区状态
function Show-PartitionStatus {
    Write-Info "当前分区状态："
    Write-Host ""

    $statusQuery = @"
SELECT
    PARTITION_NAME AS '分区名称',
    PARTITION_DESCRIPTION AS '分区范围',
    TABLE_ROWS AS '行数',
    ROUND(DATA_LENGTH / 1024 / 1024, 2) AS '数据大小(MB)',
    ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS '索引大小(MB)',
    PARTITION_COMMENT AS '备注'
FROM INFORMATION_SCHEMA.PARTITIONS
WHERE TABLE_SCHEMA='$DBName' AND TABLE_NAME='time_series_data'
ORDER BY PARTITION_ORDINAL_POSITION
"@

    # 使用mysql命令直接输出表格
    $mysqlPath = "mysql"
    $connectionArgs = @(
        "-h$DBHost",
        "-P$DBPort",
        "-u$DBUser"
    )

    if ($DBPassword) {
        $connectionArgs += "-p$DBPassword"
    }

    $connectionArgs += "-D$DBName", "-t", "-e", $statusQuery

    & $mysqlPath $connectionArgs

    # 显示分区总数
    $countQuery = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.PARTITIONS WHERE TABLE_SCHEMA='$DBName' AND TABLE_NAME='time_series_data'"
    $count = Invoke-MySQLQuery -Query $countQuery

    Write-Host ""
    Write-Info "分区总数: $count"
}

# 主函数
function Main {
    # 测试数据库连接
    if (-not (Test-MySQLConnection)) {
        exit 1
    }

    # 执行操作
    switch ($Action) {
        "add" {
            if ($Months -le 0) {
                Write-Error-Custom "请使用 -Months 参数指定要添加的月份数"
                exit 1
            }
            Add-FuturePartitions -MonthsCount $Months
        }
        "remove" {
            if ($Months -le 0) {
                Write-Error-Custom "请使用 -Months 参数指定要删除多少个月前的分区"
                exit 1
            }
            Remove-OldPartitions -MonthsAgo $Months
        }
        "status" {
            Show-PartitionStatus
        }
    }
}

# 执行主函数
Main
