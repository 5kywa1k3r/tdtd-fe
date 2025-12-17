import { Box, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface WorkListToolbarProps {
  type: 'TASK' | 'INDICATOR';
  onCreate: () => void;
}

export const WorkListToolbar = ({ type, onCreate }: WorkListToolbarProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-end',
        width: '100%',
      }}
    >
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onCreate}
        sx={{ whiteSpace: 'nowrap' }}
      >
        {type === 'TASK' ? 'Tạo nhiệm vụ mới' : 'Tạo chỉ tiêu mới'}
      </Button>
    </Box>
  );
};
