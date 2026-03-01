// src/components/label/labelMultiSelect.tsx
import { useRef, useState } from 'react';
import { Chip, Divider, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

import type { LabelOption } from './labelTypes';
import { LabelCreateForm, type LabelMode } from './LabelCreateForm';

const CREATE_LABEL_VALUE = '__create_label__';

type Props = {
  label?: string;
  options: LabelOption[];

  value: LabelOption[];
  onChange: (next: LabelOption[]) => void;

  onLabelSaved: (saved: LabelOption) => void;

  // để thu nhỏ width component
  sx?: SxProps<Theme>;

  autoOpenEditOnSelect?: boolean;
};

export function LabelMultiSelect({
  label = 'Nhãn',
  options,
  value,
  onChange,
  onLabelSaved,
  sx,
  autoOpenEditOnSelect = true,
}: Props) {
  // ===== dialog state trong Multi =====
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<LabelMode>('create');
  const [dialogItem, setDialogItem] = useState<LabelOption | null>(null);

  const openCreate = () => {
    setDialogMode('create');
    setDialogItem(null);
    setDialogOpen(true);
  };

  const openEdit = (item: LabelOption) => {
    setDialogMode('edit');
    setDialogItem(item);
    setDialogOpen(true);
  };

  const prevIdsRef = useRef<string[]>(value.map(v => v.id));

  return (
    <>
      <TextField
        label={label}
        size="small"
        select
        fullWidth
        sx={{
          minWidth: 200,
          ...sx, //  biến sx nằm đúng scope ở đây
        }}
        slotProps={{
          select: {
            multiple: true,
            value: value.map(x => x.id),
            onChange: (e) => {
              const ids = e.target.value as string[];

              // action "+ Thêm nhãn"
              if (ids.includes(CREATE_LABEL_VALUE)) {
                openCreate();
                return;
              }

              const nextSelected = options.filter(o => ids.includes(o.id));
              onChange(nextSelected);

              if (!autoOpenEditOnSelect) {
                prevIdsRef.current = ids;
                return;
              }

              const prevIds = prevIdsRef.current;
              prevIdsRef.current = ids;

              const addedId = ids.find(id => !prevIds.includes(id));
              if (!addedId) return;

              const added = options.find(o => o.id === addedId);
              if (!added) return;

              openEdit(added);
            },
            renderValue: () => (
              <Stack direction="row" spacing={0.25} flexWrap="wrap">
                {value.map(v => (
                  <Chip
                    key={v.id}
                    label={v.name}
                    size="small"
                    sx={{ height: 22, fontSize: 12 }} //  nhỏ lại
                    onMouseDown={(ev) => ev.stopPropagation()}
                    onClick={() => openEdit(v)} // click chip mở edit
                  />
                ))}
              </Stack>
            ),
          },
        }}
      >
        {options.map(o => (
          <MenuItem key={o.id} value={o.id}>
            {o.name}
          </MenuItem>
        ))}

        <Divider sx={{ my: 0.5 }} />

        <MenuItem
          value={CREATE_LABEL_VALUE}
          onClick={(ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            openCreate();
          }}
          sx={{ py: 1 }}
        >
          <Typography variant="body2" fontWeight={700}>
            + Thêm nhãn
          </Typography>
        </MenuItem>
      </TextField>

      <LabelCreateForm
        open={dialogOpen}
        mode={dialogMode}
        label={dialogItem}
        onRequestClose={() => setDialogOpen(false)}
        onSaved={(saved) => {
          onLabelSaved(saved);

          // create => auto select label mới
          if (dialogMode === 'create') {
            if (!value.some(x => x.id === saved.id)) onChange([...value, saved]);
          }

          // edit => update chip/name nếu đang selected
          if (dialogMode === 'edit') {
            if (value.some(x => x.id === saved.id)) {
              onChange(value.map(x => (x.id === saved.id ? saved : x)));
            }
          }
        }}
      />
    </>
  );
}
