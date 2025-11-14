export enum Platform {
  Bluesky = 'Bluesky',
  Facebook = 'Facebook',
}

export enum PostStatus {
  Scheduled = 'scheduled',
  Posting = 'posting',
  Posted = 'posted',
  Failed = 'failed',
}

export interface Post {
  id: string;
  content: string;
  image?: {
    url: string;
    name: string;
  };
  imageFile?: File;
  platform: Platform;
  scheduledTime: Date;
  status: PostStatus;
  error?: string;
  postUri?: string;
}