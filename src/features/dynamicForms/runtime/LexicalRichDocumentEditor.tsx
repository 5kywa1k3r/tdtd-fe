import { useEffect, useMemo, useRef } from "react";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import {
  $createParagraphNode,
  $getRoot,
  $insertNodes,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
} from "lexical";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { ListItemNode, ListNode } from "@lexical/list";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
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
      element.removeAttribute(attr.name);
    });

    Array.from(element.childNodes).forEach(clean);
  };

  Array.from(template.content.childNodes).forEach(clean);
  return template.innerHTML.trim();
}

function normalizeRichDocumentValue(value: string) {
  const sanitized = sanitizeRichDocumentHtml(value);
  if (!sanitized) return "";

  const template = document.createElement("template");
  template.innerHTML = sanitized;
  const text = (template.content.textContent ?? "").replace(/\u00a0/g, " ").trim();
  return text ? sanitized : "";
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

function RichDocumentToolbar({ locked }: { locked: boolean }) {
  const [editor] = useLexicalComposerContext();
  if (locked) return null;

  const formatText = (format: "bold" | "italic") => {
    editor.focus(() => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
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

  return (
    <Stack direction="row" spacing={0.25}>
      <Tooltip title="In đậm">
        <IconButton size="small" onClick={() => formatText("bold")}>
          <FormatBoldIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="In nghiêng">
        <IconButton size="small" onClick={() => formatText("italic")}>
          <FormatItalicIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Chèn bảng 3x3">
        <IconButton size="small" onClick={insertTable}>
          <TableChartOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

function RichDocumentPlugins({
  value,
  locked,
  minHeight,
  label,
  required,
  onChange,
}: LexicalRichDocumentEditorProps) {
  const [editor] = useLexicalComposerContext();
  const lastHtmlRef = useRef<string | null>(null);
  const sanitizedValue = useMemo(() => sanitizeRichDocumentHtml(value), [value]);

  useEffect(() => {
    editor.setEditable(!locked);
  }, [editor, locked]);

  useEffect(() => {
    if (lastHtmlRef.current === sanitizedValue) return;
    lastHtmlRef.current = sanitizedValue;
    loadHtmlIntoEditor(editor, sanitizedValue);
  }, [editor, sanitizedValue]);

  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{
          px: 1,
          py: 0.75,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.default",
        }}
      >
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          {label}{required ? " *" : ""}
        </Typography>
        <RichDocumentToolbar locked={locked} />
      </Stack>

      <Box
        sx={{
          position: "relative",
          minHeight: Math.max(180, minHeight),
          bgcolor: locked ? "action.disabledBackground" : "background.paper",
          "& .tdtd-lexical-rich-editor": {
            minHeight: Math.max(180, minHeight),
            px: 1.25,
            py: 1,
            outline: "none",
            overflow: "auto",
            whiteSpace: "pre-wrap",
          },
          "& .tdtd-lexical-rich-editor:focus": {
            boxShadow: "inset 0 0 0 2px rgba(25, 118, 210, 0.28)",
          },
          "& .tdtd-lexical-placeholder": {
            position: "absolute",
            left: 10,
            top: 9,
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
        }}
      >
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="tdtd-lexical-rich-editor"
              aria-label={label}
              aria-placeholder="Nhập nội dung..."
              aria-multiline="true"
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
      <TablePlugin />
      <OnChangePlugin
        ignoreSelectionChange
        onChange={(editorState) => {
          let next = "";
          editorState.read(() => {
            next = normalizeRichDocumentValue($generateHtmlFromNodes(editor));
          });
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
