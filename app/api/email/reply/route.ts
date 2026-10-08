import { ApiError, apiError } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";

// Retired legacy endpoint: its old Resend schema did not preserve the
// connected Microsoft sender or conversation. Use Reply Studio for both
// generation and staff-approved sending.
export async function POST() {
  try {
    await requireUser();
    throw new ApiError("forbidden", "Send from the connected Outlook Reply Studio instead.");
  } catch (error) {
    return apiError(error);
  }
}
