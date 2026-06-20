import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './axiosBaseQuery';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Me', 'Units', 'Users', 'UnitHistory', 'UnitTypes', 'Positions', 'Tasks', 'DynamicExcel', 'DynamicForm', 'Label', 'LabelEnumCatalog', 'UsersSearch',
     'WorkHistory', 'Work', 'WorkFile', 'WorkDocument', 'PickersUnits', 'PickersUsers', 'PickersCatalog', 'PickersLeaders', 'PickersAssignees', 'WorkAssignment',
     'WorkAssignmentHandoverHistory', 'DynamicFormCloneRequest',
     //Report
     'ReportTemplateGroup', 'WorkAssignmentReportList', 'WorkAssignmentReportSearch', 'WorkAssignmentReport', 'WorkAssignmentByDynamicExcel',
     'WorkAssignmentChildren', 'WorkAssignmentChildrenByDynamicExcel',
     'AssignmentEvaluationLog', 'ReviewSummary', 'ReviewReport',
     'LabelStatisticSummary', 'TableStatisticSummary', 'FieldStatisticSummary',
     'AdvancedSummaryConfig',
     'ReportPayloadDiagnostics',
     'Notification',
     'UserActionLog', 'JobRun', 'SummaryToken',
     //evaluation
     'EvaluationTemplate',
     'DashboardMindMap',
     'DashboardMindMapNode',
     'DashboardMindMapUnits',
     'DashboardMindMapReports'

    ],  
  endpoints: () => ({}),
});
