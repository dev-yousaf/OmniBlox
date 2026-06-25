export class InboxMessageDto {
  id: string;
  subject: string;
  body: string;
  read: boolean;
  fromUserId?: string;
  fromUserName?: string;
  createdAt: string;
}

export class InboxListResponseDto {
  messages: InboxMessageDto[];
  total: number;
  unreadCount: number;
}
