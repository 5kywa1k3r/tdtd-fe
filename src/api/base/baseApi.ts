import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './axiosBaseQuery';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Me', 'Units', 'Users', 'UnitHistory', 'Tasks', 'DynamicExcel', 'UsersSearch',
     'WorkHistory', 'Work', 'WorkFile', 'PickersUnits', 'PickersLeaders', 'PickersAssignees', 'WorkAssignment',
     //Report
     'ReportTemplateGroup', 'WorkAssignmentReportList', 'WorkAssignmentReportSearch', 'WorkAssignmentReport',

    ],  
  endpoints: () => ({}),
});