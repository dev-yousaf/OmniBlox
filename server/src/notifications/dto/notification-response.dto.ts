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

export class CreateNotificationDto {
  type: string;
  title: string;
  message: string;
  link?: string;
  userId?: string;
}
