import { useNavigate } from "react-router-dom";
import ExcelDesigner from "../../components/excel/ExcelDesigner";

export default function DynamicExcelCreatePage() {
  const navigate = useNavigate();

  return (
    <ExcelDesigner
      mode="create"
      onBack={() => navigate("/dynamic-excel")}
      onSaved={() => navigate("/dynamic-excel")}
    />
  );
}
