/**
 * CRUD组件库导出文件
 *
 * 统一导出所有CRUD相关组件，方便其他模块导入使用
 */

// 导出核心组件
export { CRUDPageTemplate } from './CRUDPageTemplate';
export { CRUDDataTable } from './CRUDDataTable';
export { CRUDFormModal } from './CRUDFormModal';
export { CRUDActionBar } from './CRUDActionBar';
export { CRUDSearchBar } from './CRUDSearchBar';

// 导出类型定义（方便使用）
export type {
  CRUDPageTemplateProps,
  CRUDDataTableProps,
  CRUDFormModalProps,
  CRUDActionBarProps,
  CRUDSearchBarProps,
  ColumnDef,
  FormFieldConfig,
  FilterConfig,
} from '../../types/crud';
