export interface FeedbackMenuItem {
  id: string;
  menuId: string;
  menuName: string;
  rating: number; // 1 to 5
  comment?: string | null;
}

export interface Feedback {
  id: string;
  tenantId: string;
  sessionId?: string | null;
  tableId?: string | null;
  tableName?: string | null;
  customerName?: string | null;
  overallRating: number; // 1 to 5
  comment?: string | null;
  createdAt: string;
  items: FeedbackMenuItem[];
}

export interface FeedbackRatingDistribution {
  rating: number;
  count: number;
}

export interface FeedbackMenuStat {
  menuId: string;
  menuName: string;
  avgRating: number;
  totalRatings: number;
}

export interface FeedbackSummary {
  totalReviews: number;
  averageRating: number;
  distribution: FeedbackRatingDistribution[];
  menuRatings: FeedbackMenuStat[];
}

export interface FeedbackPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedFeedbacks {
  items: Feedback[];
  pagination: FeedbackPagination;
}

export interface SubmitFeedbackPayload {
  overallRating: number;
  customerName?: string;
  comment?: string;
  items?: {
    menuId: string;
    rating: number;
    comment?: string;
  }[];
}

