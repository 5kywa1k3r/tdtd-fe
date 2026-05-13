import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './axiosBaseQuery';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Me', 'Units', 'Users', 'UnitHistory', 'UnitTypes', 'Positions', 'Tasks', 'DynamicExcel', 'DynamicForm', 'Label', 'UsersSearch',
     'WorkHistory', 'Work', 'WorkFile', 'PickersUnits', 'PickersLeaders', 'PickersAssignees', 'WorkAssignment',
     'WorkAssignmentHandoverHistory', 'DynamicFormCloneRequest',
     //Report
     'ReportTemplateGroup', 'WorkAssignmentReportList', 'WorkAssignmentReportSearch', 'WorkAssignmentReport', 'WorkAssignmentByDynamicExcel',
     'WorkAssignmentChildren', 'WorkAssignmentChildrenByDynamicExcel',
     'AssignmentEvaluationLog', 'ReviewSummary', 'ReviewReport',
     'LabelStatisticSummary', 'TableStatisticSummary', 'FieldStatisticSummary',
     'Notification',
     'UserActionLog', 'JobRun',
     //evaluation
     'EvaluationTemplate',
     'DashboardMindMap',
     'DashboardMindMapNode',
     'DashboardMindMapUnits',
     'DashboardMindMapReports'

    ],  
  endpoints: () => ({}),
});
