# Frontend Common Rules

> Navigation: `../ARCHITECTURE_MAP.md` -> `../DOCUMENTATION_MAP.md` -> this file.
> Type: Frontend rule doc.

Mục tiêu của rule này là giữ cho các màn FE có cùng một ngôn ngữ hiển thị và cùng pattern triển khai, đặc biệt với các bảng dữ liệu, filter bar và picker dùng nhiều lần.

## 1. Table Pattern

- Mọi bảng entity list phải ưu tiên dùng `src/components/common/AppTable.tsx`.
- Page/container giữ `data-fetch`, `applied filter state`, action side effect và navigation.
- Filter/search bar đủ phức tạp phải tách thành component riêng, không nhét chung vào table component.
- Table component chỉ nên giữ:
  - `columns`
  - row actions
  - `AppTable`
- Nếu API chưa hỗ trợ server sort/search/paging đầy đủ thì dùng `AppTable` client mode trên dataset FE đang có; không tự dựng `TableContainer/TableHead/TableBody` mới chỉ để làm list entity.

## 2. Common Component Usage

### Table

- Dùng `AppTable` cho bảng dữ liệu.
- Không render `TableContainer`, `TableHead`, `TableBody`, `TablePagination` thủ công cho entity table mới nếu `AppTable` đáp ứng được.

### Picker / dropdown chuẩn

- Chọn đơn vị: `src/components/common/LazyUnitMultiSelect.tsx`
- Chọn user / leader / assignee theo đơn vị: `src/components/pickers/HybridUnitUserPicker.tsx`
- Chọn một ngày: `src/components/common/SingleDayKeyField.tsx`
- Chọn khoảng ngày: `src/components/common/dateRanger/MantineDateRangeFilter.tsx`

### Display primitive chuẩn

- Label dài trong cell: `src/components/common/CommonLabelText.tsx`
- Ngày / ngày giờ trong cell: `src/components/common/CommonDateText.tsx`
- Boolean chip như `Có/Không`, `Đang dùng/Ngừng dùng`: `src/components/common/BooleanChip.tsx`

### Domain chip wrapper hiện có

- Work status: `src/components/common/StatusChip.tsx`, `src/components/common/WorkStatusChip.tsx`
- Report status: `src/components/reports/ReportStatusChip.tsx`
- Report period status: `src/components/reports/ReportPeriodStatusChip.tsx`
- Assignment progress: `src/components/reports/AssignmentProgressChip.tsx`

## 3. Display Rules

- Không format ngày trực tiếp trong cell bằng `dayjs(...).format(...)` hoặc `toLocaleDateString`/`toLocaleString`; dùng `CommonDateText`.
- Không render text dài bằng `Typography noWrap` lặp lại nhiều nơi; dùng `CommonLabelText`.
- Không render raw `Chip` cho trạng thái/boolean khi đã có wrapper/common primitive tương ứng.
- Với chip không phải boolean/status chung, chỉ dùng raw `Chip` nếu chưa có common/domain wrapper phù hợp.

## 4. Filter Rules

- Filter local FE:
  - giữ state ở page/container
  - component filter chỉ là UI controlled
- Filter đang bám server query:
  - page giữ `draft` và `applied` state nếu cần nút `Tìm kiếm`
  - table không tự giữ filter state riêng
- Không để cùng một màn có nhiều search surface cho cùng một danh sách dữ liệu.

## 5. Refactor Rule

- Khi refactor màn cũ:
  - ưu tiên gom search/filter lên một `FilterBar`
  - tách table thành pure component
  - thay date/label/boolean hiển thị sang common primitive
- Không mở thêm backend/API chỉ để đạt chuẩn FE nếu pass hiện tại được chốt là FE-only.