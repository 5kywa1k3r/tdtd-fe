import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Box, Divider, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignJustifyIcon from "@mui/icons-material/FormatAlignJustify";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatClearIcon from "@mui/icons-material/FormatClear";
import FormatIndentDecreaseIcon from "@mui/icons-material/FormatIndentDecrease";
import FormatIndentIncreaseIcon from "@mui/icons-material/FormatIndentIncrease";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import RedoIcon from "@mui/icons-material/Redo";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import UndoIcon from "@mui/icons-material/Undo";
import {
  $createParagraphNode,
  $getSelection,
  $getRoot,
  $insertNodes,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  mergeRegister,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  type ElementFormatType,
  type LexicalEditor,
  type TextFormatType,
} from "lexical";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { $createQuoteNode, HeadingNode, QuoteNode } from "@lexical/rich-text";
import {
  INSERT_TABLE_COMMAND,
  TableCellNode,
  TableNode,
  TableRowNode,
} from "@lexical/table";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";

const richDocumentAllowedTags = new Set([
  "A",
  "B",
  "BLOCKQUOTE",
  "BR",
  "DIV",
  "EM",
  "H1",
  "H2",
  "H3",
  "I",
  "LI",
  "OL",
  "P",
  "SPAN",
  "STRONG",
  "TABLE",
  "TBODY",
  "TD",
  "TH",
  "THEAD",
  "TR",
  "U",
  "UL",
]);

type LexicalRichDocumentEditorProps = {
  label: string;
  value: string;
  required: boolean;
  minHeight: number;
  locked: boolean;
  describedBy?: string;
  invalid?: boolean;
  onChange: (value: string | null) => void;
};

function sanitizeRichDocumentHtml(value: string) {
  if (!value.trim() || typeof document === "undefined") return "";

  const template = document.createElement("template");
  template.innerHTML = value;

  const clean = (node: Node) => {
    if (node.nodeType === Node.COMMENT_NODE) {
      node.parentNode?.removeChild(node);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as HTMLElement;
    if (!richDocumentAllowedTags.has(element.tagName)) {
      const parent = element.parentNode;
      if (!parent) return;
      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
      parent.removeChild(element);
      Array.from(parent.childNodes).forEach(clean);
      return;
    }

    Array.from(element.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name === "href" && element.tagName === "A") {
        const href = attr.value.trim();
        if (/^(https?:|mailto:)/i.test(href)) return;
      }
      if (name === "colspan" || name === "rowspan") {
        const span = Number(attr.value);
        if (Number.isInteger(span) && span > 0 && span <= 50) return;
      }
      if (name === "style") {
        const safeStyle = sanitizeInlineStyle(attr.value);
        if (safeStyle) {
          element.setAttribute("style", safeStyle);
          return;
        }
      }
      element.removeAttribute(attr.name);
    });

    Array.from(element.childNodes).forEach(clean);
  };

  Array.from(template.content.childNodes).forEach(clean);
  return template.innerHTML.trim();
}

function sanitizeInlineStyle(value: string) {
  const allowed = new Map<string, (raw: string) => string | null>([
    ["text-align", (raw) => (/^(left|right|center|justify|start|end)$/i.test(raw.trim()) ? raw.trim().toLowerCase() : null)],
    ["margin-left", sanitizeLength],
    ["padding-left", sanitizeLength],
    ["text-indent", sanitizeLength],
    ["text-decoration", (raw) => (/^(underline|none)$/i.test(raw.trim()) ? raw.trim().toLowerCase() : null)],
  ]);

  return value
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separator = item.indexOf(":");
      if (separator <= 0) return null;
      const property = item.slice(0, separator).trim().toLowerCase();
      const sanitizer = allowed.get(property);
      if (!sanitizer) return null;
      const safeValue = sanitizer(item.slice(separator + 1));
      return safeValue ? `${property}: ${safeValue}` : null;
    })
    .filter((item): item is string => Boolean(item))
    .join("; ");
}

function sanitizeLength(value: string) {
  const normalized = value.trim().toLowerCase();
  return /^-?\d{1,3}(\.\d{1,2})?(px|pt|em|rem|%)$/.test(normalized) ? normalized : null;
}

function normalizeRichDocumentValue(value: string) {
  const sanitized = sanitizeRichDocumentHtml(value);
  if (!sanitized) return "";

  const text = getRichDocumentText(sanitized);
  return text ? sanitized : "";
}

function getRichDocumentText(value: string) {
  if (!value.trim() || typeof document === "undefined") return "";
  const template = document.createElement("template");
  template.innerHTML = value;
  return (template.content.textContent ?? "").replace(/\u00a0/g, " ").trim();
}

function loadHtmlIntoEditor(editor: LexicalEditor, html: string) {
  editor.update(() => {
    const root = $getRoot();
    root.clear();

    if (!html || typeof DOMParser === "undefined") {
      root.append($createParagraphNode());
      return;
    }

    const dom = new DOMParser().parseFromString(html, "text/html");
    const nodes = $generateNodesFromDOM(editor, dom);
    if (nodes.length > 0) {
      root.select();
      $insertNodes(nodes);
      return;
    }

    root.append($createParagraphNode());
  });
}

function ToolbarSeparator() {
  return <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />;
}

function ToolbarIconButton({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip title={title}>
      <span>
        <IconButton
          size="small"
          aria-label={title}
          disabled={disabled}
          onClick={onClick}
          sx={{
            width: 30,
            height: 30,
            borderRadius: 0.75,
            color: "text.secondary",
            "&:hover": { bgcolor: "action.selected", color: "primary.main" },
          }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

function RichDocumentToolbar({ locked }: { locked: boolean }) {
  const [editor] = useLexicalComposerContext();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(
    () =>
      mergeRegister(
        editor.registerCommand(CAN_UNDO_COMMAND, (payload) => {
          setCanUndo(payload);
          return false;
        }, COMMAND_PRIORITY_LOW),
        editor.registerCommand(CAN_REDO_COMMAND, (payload) => {
          setCanRedo(payload);
          return false;
        }, COMMAND_PRIORITY_LOW),
      ),
    [editor],
  );

  if (locked) return null;

  const formatText = (format: TextFormatType) => {
    editor.focus(() => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    });
  };

  const formatElement = (format: ElementFormatType) => {
    editor.focus(() => {
      editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, format);
    });
  };

  const insertTable = () => {
    editor.focus(() => {
      editor.dispatchCommand(INSERT_TABLE_COMMAND, {
        columns: "3",
        rows: "3",
        includeHeaders: false,
      });
    });
  };

  const insertQuote = () => {
    editor.focus(() => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        const quote = $createQuoteNode();
        const paragraph = $createParagraphNode();
        quote.append(paragraph);
        selection.insertNodes([quote]);
        paragraph.select();
      });
    });
  };

  return (
    <Stack
      direction="row"
      spacing={0.25}
      useFlexGap
      flexWrap="wrap"
      alignItems="center"
      sx={{
        px: 0.5,
        py: 0.25,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "#f7f7f7",
      }}
    >
      <ToolbarIconButton title="Hoàn tác" disabled={!canUndo} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}>
        <UndoIcon fontSize="small" />
      </ToolbarIconButton>
      <ToolbarIconButton title="Làm lại" disabled={!canRedo} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}>
        <RedoIcon fontSize="small" />
      </ToolbarIconButton>
      <ToolbarSeparator />
      <ToolbarIconButton title="In đậm" onClick={() => formatText("bold")}>
        <FormatBoldIcon fontSize="small" />
      </ToolbarIconButton>
      <ToolbarIconButton title="In nghiêng" onClick={() => formatText("italic")}>
        <FormatItalicIcon fontSize="small" />
      </ToolbarIconButton>
      <ToolbarIconButton title="Gạch chân" onClick={() => formatText("underline")}>
        <FormatUnderlinedIcon fontSize="small" />
      </ToolbarIconButton>
      <ToolbarSeparator />
      <ToolbarIconButton title="Danh sách gạch đầu dòng" onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}>
        <FormatListBulletedIcon fontSize="small" />
      </ToolbarIconButton>
      <ToolbarIconButton title="Danh sách đánh số" onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}>
        <FormatListNumberedIcon fontSize="small" />
      </ToolbarIconButton>
      <ToolbarIconButton title="Bỏ danh sách" onClick={() => editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)}>
        <FormatClearIcon fontSize="small" />
      </ToolbarIconButton>
      <ToolbarIconButton title="Dịch ra ngoài" onClick={() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)}>
        <FormatIndentDecreaseIcon fontSize="small" />
      </ToolbarIconButton>
      <ToolbarIconButton title="Dịch vào trong" onClick={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)}>
        <FormatIndentIncreaseIcon fontSize="small" />
      </ToolbarIconButton>
      <ToolbarSeparator />
      <ToolbarIconButton title="Canh trái" onClick={() => formatElement("left")}>
        <FormatAlignLeftIcon fontSize="small" />
      </ToolbarIconButton>
      <ToolbarIconButton title="Giữa" onClick={() => formatElement("center")}>
        <FormatAlignCenterIcon fontSize="small" />
      </ToolbarIconButton>
      <ToolbarIconButton title="Canh phải" onClick={() => formatElement("right")}>
        <FormatAlignRightIcon fontSize="small" />
      </ToolbarIconButton>
      <ToolbarIconButton title="Sắp chữ" onClick={() => formatElement("justify")}>
        <FormatAlignJustifyIcon fontSize="small" />
      </ToolbarIconButton>
      <ToolbarSeparator />
      <ToolbarIconButton title="Khối trích dẫn" onClick={insertQuote}>
        <FormatQuoteIcon fontSize="small" />
      </ToolbarIconButton>
      <ToolbarIconButton title="Chèn bảng 3x3" onClick={insertTable}>
        <TableChartOutlinedIcon fontSize="small" />
      </ToolbarIconButton>
    </Stack>
  );
}

function RichDocumentPlugins({
  value,
  locked,
  minHeight,
  label,
  required,
  describedBy,
  invalid = false,
  onChange,
}: LexicalRichDocumentEditorProps) {
  const [editor] = useLexicalComposerContext();
  const lastHtmlRef = useRef<string | null>(null);
  const sanitizedValue = useMemo(() => sanitizeRichDocumentHtml(value), [value]);
  const [charCount, setCharCount] = useState(() => getRichDocumentText(sanitizedValue).length);

  useEffect(() => {
    editor.setEditable(!locked);
  }, [editor, locked]);

  useEffect(() => {
    if (lastHtmlRef.current === sanitizedValue) return;
    lastHtmlRef.current = sanitizedValue;
    setCharCount(getRichDocumentText(sanitizedValue).length);
    loadHtmlIntoEditor(editor, sanitizedValue);
  }, [editor, sanitizedValue]);

  return (
    <>
      <Stack
        spacing={0.75}
        sx={{
          px: 1,
          py: 0.75,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.default",
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} noWrap>
            {label}{required ? " *" : ""}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ flex: "0 0 auto" }}>
            Số ký tự: {charCount}
          </Typography>
        </Stack>
        <RichDocumentToolbar locked={locked} />
      </Stack>

      <Box
        sx={{
          position: "relative",
          minHeight: Math.max(180, minHeight),
          bgcolor: locked ? "action.disabledBackground" : "#eef1f5",
          p: { xs: 1, md: 2 },
          "& .tdtd-lexical-rich-editor": {
            boxSizing: "border-box",
            width: "100%",
            maxWidth: 920,
            minHeight: Math.max(180, minHeight),
            mx: "auto",
            px: { xs: 2, md: 5 },
            py: { xs: 2, md: 4 },
            outline: "none",
            overflow: "auto",
            whiteSpace: "pre-wrap",
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: invalid ? "error.main" : "divider",
            boxShadow: "0 14px 34px rgba(15, 23, 42, 0.12)",
            color: "text.primary",
            fontFamily: '"Times New Roman", serif',
            fontSize: 16,
            lineHeight: 1.45,
          },
          "& .tdtd-lexical-rich-editor:focus": {
            boxShadow: "inset 0 0 0 2px rgba(25, 118, 210, 0.28)",
          },
          "& .tdtd-lexical-placeholder": {
            position: "absolute",
            left: { xs: 28, md: "calc(50% - 400px)" },
            top: { xs: 28, md: 44 },
            color: "text.disabled",
            pointerEvents: "none",
            userSelect: "none",
          },
          "& p": { my: 0.5 },
          "& h1, & h2, & h3": {
            mt: 1,
            mb: 0.5,
            lineHeight: 1.25,
          },
          "& table": {
            width: "100%",
            borderCollapse: "collapse",
            my: 1,
          },
          "& th, & td": {
            border: "1px solid",
            borderColor: "divider",
            minWidth: 72,
            minHeight: 32,
            px: 0.75,
            py: 0.5,
            verticalAlign: "top",
          },
          "& th": {
            bgcolor: "action.hover",
            fontWeight: 700,
          },
          "& ul, & ol": {
            pl: 3,
          },
          "& blockquote": {
            borderLeft: "4px solid",
            borderColor: "divider",
            color: "text.secondary",
            ml: 0,
            pl: 2,
          },
        }}
      >
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="tdtd-lexical-rich-editor"
              aria-label={label}
              aria-required={required || undefined}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              aria-placeholder="Nhập nội dung..."
              aria-multiline="true"
              placeholder={<span />}
            />
          }
          placeholder={
            locked ? null : (
              <Typography variant="body2" className="tdtd-lexical-placeholder">
                Nhập nội dung...
              </Typography>
            )
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
      </Box>

      <HistoryPlugin />
      <ListPlugin shouldPreserveNumbering />
      <TablePlugin />
      <OnChangePlugin
        ignoreSelectionChange
        onChange={(editorState) => {
          let next = "";
          editorState.read(() => {
            next = normalizeRichDocumentValue($generateHtmlFromNodes(editor));
          });
          setCharCount(getRichDocumentText(next).length);
          if (lastHtmlRef.current === next) return;
          lastHtmlRef.current = next;
          onChange(next || null);
        }}
      />
    </>
  );
}

export default function LexicalRichDocumentEditor(props: LexicalRichDocumentEditorProps) {
  const { label, minHeight, locked } = props;
  const initialConfig = useMemo(
    () => ({
      namespace: `tdtd-rich-document-${label}`,
      editable: !locked,
      nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        TableNode,
        TableCellNode,
        TableRowNode,
      ],
      onError(error: Error) {
        throw error;
      },
    }),
    [label, locked],
  );

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
        minHeight,
      }}
    >
      <LexicalComposer initialConfig={initialConfig}>
        <RichDocumentPlugins {...props} />
      </LexicalComposer>
    </Box>
  );
}
