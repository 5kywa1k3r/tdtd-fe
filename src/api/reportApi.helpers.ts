import type {
  MyReportTemplateSearchRequest,
  WorkAssignmentReportSearchRequest,
} from "../types/report";
import type { ReviewReportFlatSearchRequest } from "../types/reportReview";

export const DEFAULT_MY_REPORT_TEMPLATE_SEARCH: MyReportTemplateSearchRequest = {
  page: 0,
  pageSize: 20,
  q: "",
  isActive: null,
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

export const DEFAULT_REVIEW_REPORT_SEARCH: ReviewReportFlatSearchRequest = {
  workId: "",
  assignmentId: "",
  q: "",
  dynamicExcelId: null,
  periodKey: "",
  waitingReviewOnly: null,
  reportStatus: null,
  page: 0,
  pageSize: 20,
};
