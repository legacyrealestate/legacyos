import { apiError } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { GET as crmPropertiesGET } from "@/app/api/crm/properties/route";

export async function GET() {
  try {
    await requireUser();
    return crmPropertiesGET();
  } catch (error) {
    return apiError(error);
  }
}
