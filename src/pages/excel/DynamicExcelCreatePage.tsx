import { useNavigate } from "react-router-dom";
import ExcelDesigner from "../../components/excel/fortune/ExcelDesigner";
import { useCreateDynamicExcelMutation, useNextDynamicExcelCodeQuery } from "../../api/dynamicExcelApi";

export default function DynamicExcelCreatePage() {
  const navigate = useNavigate();
  const [create] = useCreateDynamicExcelMutation();

  const year = new Date().getFullYear();
  const nextCodeQ = useNextDynamicExcelCodeQuery({ year });

  const code = nextCodeQ.data?.nextCode ?? "";

  return (
    <ExcelDesigner
      mode="create"
      meta={{ code: code, name: "" }}
      onBack={() => navigate("/dynamic-excel")}
      onSaved={async (p) => {
        await create({
          code: code || null,
          name: p.name,
          labels: [],
          rawWorkbookDataJson: JSON.stringify(p.rawWorkbookData),
          specJson: JSON.stringify(p.spec),
          dataRect: { r0: p.dataRect.r0, c0: p.dataRect.c0, r1: p.dataRect.r1, c1: p.dataRect.c1 },
          w: p.W,
          h: p.H,
        }).unwrap();

        navigate("/dynamic-excel");
      }}
    />
  );
}