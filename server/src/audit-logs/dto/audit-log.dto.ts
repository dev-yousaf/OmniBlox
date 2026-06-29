export class AuditLogEntryDto {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  createdAt: string;
}

export class AuditLogListResponseDto {
  logs: AuditLogEntryDto[];
  total: number;
  page: number;
  limit: number;
}

export class CreateAuditLogDto {
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
}
