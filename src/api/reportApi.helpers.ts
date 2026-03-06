// src/api/reportApi.helpers.ts
import type {
  MyReportTemplateSearchRequest,
  WorkAssignmentReportSearchRequest,
} from "../types/report";

export const DEFAULT_MY_REPORT_TEMPLATE_SEARCH: MyReportTemplateSearchRequest = {
  page: 0,
  pageSize: 20,
  q: "",
  isActive: true,
  hasReport: null,
  sortField: "latestUpdatedAtUtc",
  sortDirection: "desc",
};

export const DEFAULT_REPORT_SEARCH: WorkAssignmentReportSearchRequest = {
  page: 0,
  pageSize: 20,
  q: "",
  periodKey: "",
  status: null,
  isCurrent: null,
  sortField: "updatedAtUtc",
  sortDirection: "desc",
};