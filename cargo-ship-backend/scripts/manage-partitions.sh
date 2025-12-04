#!/bin/bash

###############################################################################
# MySQL分区管理脚本
#
# 功能：
# 1. 自动为time_series_data表添加未来月份的分区
# 2. 删除过期的历史分区（可选）
# 3. 检查和报告分区状态
#
# 使用方法：
# ./manage-partitions.sh add 6       # 添加未来6个月的分区
# ./manage-partitions.sh remove 24   # 删除24个月前的分区
# ./manage-partitions.sh status      # 查看分区状态
#
# 建议：
# 将此脚本添加到cron定时任务，每月自动执行一次
# 0 0 1 * * /path/to/manage-partitions.sh add 6
###############################################################################

# 数据库配置（从环境变量读取）
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-cargo_ships_db}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# MySQL连接测试
test_connection() {
  mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" >/dev/null 2>&1
  if [ $? -ne 0 ]; then
    log_error "无法连接到MySQL数据库"
    exit 1
  fi
  log_info "数据库连接成功"
}

# 添加未来分区
add_future_partitions() {
  local months=$1
  log_info "开始添加未来 $months 个月的分区..."

  for i in $(seq 1 $months); do
    # 计算未来月份
    local target_date=$(date -d "+$i month" +%Y-%m-01)
    local year=$(date -d "$target_date" +%Y)
    local month=$(date -d "$target_date" +%m)
    local next_month=$(date -d "$target_date +1 month" +%Y%m)
    local partition_name="p${year}${month}"
    local partition_value="${next_month}"

    # 检查分区是否已存在
    local exists=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" -N -e \
      "SELECT COUNT(*) FROM INFORMATION_SCHEMA.PARTITIONS
       WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='time_series_data' AND PARTITION_NAME='$partition_name';")

    if [ "$exists" -eq 0 ]; then
      # 添加分区（在p_future之前）
      log_info "添加分区: $partition_name (VALUES LESS THAN $partition_value)"

      mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" -e \
        "ALTER TABLE time_series_data REORGANIZE PARTITION p_future INTO (
          PARTITION $partition_name VALUES LESS THAN ($partition_value) COMMENT = '${year}年${month}月分区',
          PARTITION p_future VALUES LESS THAN MAXVALUE COMMENT = '未来数据分区'
        );"

      if [ $? -eq 0 ]; then
        log_info "✓ 分区 $partition_name 添加成功"
      else
        log_error "✗ 分区 $partition_name 添加失败"
      fi
    else
      log_warn "分区 $partition_name 已存在，跳过"
    fi
  done

  log_info "分区添加完成"
}

# 删除过期分区
remove_old_partitions() {
  local months_ago=$1
  log_info "开始删除 $months_ago 个月前的分区..."

  # 计算截止日期
  local cutoff_date=$(date -d "-$months_ago month" +%Y%m)

  # 获取所有分区
  local partitions=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" -N -e \
    "SELECT PARTITION_NAME FROM INFORMATION_SCHEMA.PARTITIONS
     WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='time_series_data' AND PARTITION_NAME LIKE 'p20%'
     ORDER BY PARTITION_NAME;")

  for partition in $partitions; do
    # 提取分区的年月（格式：p202511 -> 202511）
    local partition_date=${partition:1}

    # 跳过p_future分区
    if [ "$partition" == "p_future" ]; then
      continue
    fi

    # 比较日期
    if [ "$partition_date" -lt "$cutoff_date" ]; then
      log_warn "删除过期分区: $partition (${partition_date:0:4}年${partition_date:4:2}月)"

      mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" -e \
        "ALTER TABLE time_series_data DROP PARTITION $partition;"

      if [ $? -eq 0 ]; then
        log_info "✓ 分区 $partition 删除成功"
      else
        log_error "✗ 分区 $partition 删除失败"
      fi
    fi
  done

  log_info "分区删除完成"
}

# 查看分区状态
show_partition_status() {
  log_info "当前分区状态："
  echo ""

  mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" -e \
    "SELECT
       PARTITION_NAME AS '分区名称',
       PARTITION_EXPRESSION AS '分区表达式',
       PARTITION_DESCRIPTION AS '分区范围',
       TABLE_ROWS AS '行数',
       ROUND(DATA_LENGTH / 1024 / 1024, 2) AS '数据大小(MB)',
       ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS '索引大小(MB)',
       PARTITION_COMMENT AS '备注'
     FROM INFORMATION_SCHEMA.PARTITIONS
     WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='time_series_data'
     ORDER BY PARTITION_ORDINAL_POSITION;"

  echo ""
  log_info "分区总数: $(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" -N -e \
    "SELECT COUNT(*) FROM INFORMATION_SCHEMA.PARTITIONS WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='time_series_data';")"
}

# 主函数
main() {
  # 检查参数
  if [ $# -lt 1 ]; then
    echo "用法: $0 {add|remove|status} [months]"
    echo ""
    echo "示例："
    echo "  $0 add 6       - 添加未来6个月的分区"
    echo "  $0 remove 24   - 删除24个月前的分区"
    echo "  $0 status      - 查看分区状态"
    exit 1
  fi

  # 测试数据库连接
  test_connection

  # 执行操作
  case "$1" in
    add)
      if [ -z "$2" ]; then
        log_error "请指定要添加的月份数"
        exit 1
      fi
      add_future_partitions "$2"
      ;;
    remove)
      if [ -z "$2" ]; then
        log_error "请指定要删除多少个月前的分区"
        exit 1
      fi
      remove_old_partitions "$2"
      ;;
    status)
      show_partition_status
      ;;
    *)
      log_error "未知操作: $1"
      echo "有效操作: add, remove, status"
      exit 1
      ;;
  esac
}

# 执行主函数
main "$@"
