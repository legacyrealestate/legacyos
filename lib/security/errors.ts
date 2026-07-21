export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "profile_pending"
  | "profile_inactive"
  | "missing_migration"
  | "missing_configuration"
  | "provider_failure"
  | "service_unavailable"
  | "server_error";

const statusByCode: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  profile_pending: 403,
  profile_inactive: 403,
  missing_migration: 503,
  missing_configuration: 503,
  provider_failure: 502,
  service_unavailable: 503,
  server_error: 500,
};

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = statusByCode[code];
  }
}
