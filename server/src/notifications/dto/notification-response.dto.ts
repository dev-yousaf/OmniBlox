export class NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export class NotificationsListResponseDto {
  notifications: NotificationDto[];
  total: number;
  unreadCount: number;
}
