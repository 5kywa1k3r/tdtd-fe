import React, { useRef } from 'react';
import { Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import ImageIcon from '@mui/icons-material/Image';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';


export type AttachmentItem = {
  id: string;
  file: File;
  description: string | null;
};

interface AttachmentPickerProps {
  title?: string;
  accept?: string;
  multiple?: boolean;
  items: AttachmentItem[];
  onChange: (items: AttachmentItem[]) => void;
  disabled?: boolean;
}

const getFileIcon = (file: File) => {
  const name = file.name.toLowerCase();

  if (name.endsWith('.pdf')) {
    return <PictureAsPdfIcon fontSize="small" color="error" />;
  }
  if (name.endsWith('.doc') || name.endsWith('.docx')) {
    return <DescriptionIcon fontSize="small" color="primary" />;
  }
  if (name.endsWith('.xls') || name.endsWith('.xlsx')) {
    return <TableChartIcon fontSize="small" color="success" />;
  }
  if (
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg')
  ) {
    return <ImageIcon fontSize="small" color="info" />;
  }

  return <InsertDriveFileIcon fontSize="small" />;
};


const genId = () =>
  // @ts-ignore
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `att_${Date.now()}_${Math.random()}`;

export const AttachmentPicker: React.FC<AttachmentPickerProps> = ({
  title = 'Tệp đính kèm',
  accept = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg',
  multiple = true,
  items,
  onChange,
  disabled,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const next = [
      ...items,
      ...files.map((f) => ({ id: genId(), file: f, description: null as string | null })),
    ];
    onChange(next);

    // reset để chọn lại cùng file vẫn fire
    e.target.value = '';
  };

  const removeAt = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const changeDesc = (idx: number, v: string) => {
    const trimmed = v.trim();
    onChange(items.map((x, i) => (i === idx ? { ...x, description: trimmed || null } : x)));
  };

  return (
    <Stack spacing={1.25}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>

        <Button
          variant="outlined"
          startIcon={<UploadFileIcon />}
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Chọn file
        </Button>

        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={pick}
          style={{ display: 'none' }}
        />
      </Box>

      {items.length === 0 ? (
        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          Chưa có file nào.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {items.map((it, idx) => (
            <Box
              key={it.id}
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'flex-start',
                p: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  {getFileIcon(it.file)}
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {it.file.name}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ opacity: 0.75, display: 'block' }}>
                  {Math.ceil(it.file.size / 1024)} KB
                </Typography>

                <TextField
                  label="Mô tả (không bắt buộc)"
                  value={it.description ?? ''}
                  onChange={(e) => changeDesc(idx, e.target.value)}
                  fullWidth
                  size="small"
                  sx={{ mt: 1 }}
                  disabled={disabled}
                />
              </Box>

              <IconButton
                size="small"
                onClick={() => removeAt(idx)}
                aria-label="Xóa file"
                disabled={disabled}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
};
