import { apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";

export async function GET() {
  try {
    const auth = await requireUser();
    return apiJson({
      id: auth.user.id,
      email: auth.user.email,
      role: auth.role,
    });
  } catch (error) {
    return apiError(error);
  }
}
