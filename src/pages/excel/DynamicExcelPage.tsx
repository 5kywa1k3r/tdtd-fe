// src/pages/excel/DynamicExcel.tsx
import React from 'react';
import { Box } from '@mui/material';
import ExcelDesigner from '../../components/excel/ExcelDesigner';

interface DynamicExcelProps {
}

export const DynamicExcelPage: React.FC<DynamicExcelProps> = ({
}) => {
  return (
    <Box
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        height: '100%',
      }}
    >

      <Box sx={{ p: 2 }}>
        <ExcelDesigner />
      </Box>
    </Box>
  );
};

export default DynamicExcelPage;
