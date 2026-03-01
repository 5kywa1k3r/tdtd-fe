export type FieldType =
  | "TEXT"
  | "NUMBER"
  | "DATE"
  | "BOOLEAN"
  | "SELECT"
  | "DYNAMIC_TABLE";

export type TemplateFieldBase = {
  id: string;          // local uuid
  label: string;       // nhãn hiển thị
  key: string;         // mã trường (snake/camel)
  required: boolean;
};

export type TemplateField =
  | (TemplateFieldBase & {
      type: "TEXT";
      placeholder?: string;
      maxLength?: number;
    })
  | (TemplateFieldBase & {
      type: "NUMBER";
      min?: number;
      max?: number;
    })
  | (TemplateFieldBase & {
      type: "DATE";
    })
  | (TemplateFieldBase & {
      type: "BOOLEAN";
    })
  | (TemplateFieldBase & {
      type: "SELECT";
      options: string[]; // mock list option
      multiple?: boolean;
    })
  | (TemplateFieldBase & {
      type: "DYNAMIC_TABLE";
      tableId: string;    // trỏ tới dynamic-excel item id
      tableName: string;  // tên hiển thị
    });

export type TemplateDraft = {
  code: string;
  name: string;
  version: string;
  fields: TemplateField[];
};
