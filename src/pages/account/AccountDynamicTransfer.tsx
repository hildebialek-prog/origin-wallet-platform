import { Navigate } from "react-router-dom";

// Preserve bookmarks and in-flight recovery links; all payment state now lives in Move funds.
export default function AccountDynamicTransfer() {
  return <Navigate to="/account/transfers" replace />;
}
