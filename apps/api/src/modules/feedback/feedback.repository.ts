import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@dio-sys-be/db";
import {
  feedbackMenuRatings,
  feedbacks,
  menus,
  tables,
} from "@dio-sys-be/db/schema";
import { and, avg, count, desc, eq, inArray } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.module";
import type { CreateFeedbackInput } from "./feedback.schema";

@Injectable()
export class FeedbackRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async createFeedback(data: CreateFeedbackInput & { tenantId: string }) {
    const [created] = await this.db
      .insert(feedbacks)
      .values({
        tenantId: data.tenantId,
        sessionId: data.sessionId || null,
        tableId: data.tableId || null,
        customerName: data.customerName || null,
        overallRating: data.overallRating,
        comment: data.comment || null,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create feedback record");
    }

    if (data.items && data.items.length > 0) {
      await this.db.insert(feedbackMenuRatings).values(
        data.items.map((item) => ({
          feedbackId: created.id,
          menuId: item.menuId,
          rating: item.rating,
          comment: item.comment || null,
        })),
      );
    }

    return created;
  }

  async findFeedbacksPaginated(filters: {
    tenantId?: string;
    overallRating?: number;
    page: number;
    limit: number;
  }) {
    const conditions = [];

    if (filters.tenantId) {
      conditions.push(eq(feedbacks.tenantId, filters.tenantId));
    }
    if (filters.overallRating) {
      conditions.push(eq(feedbacks.overallRating, filters.overallRating));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (filters.page - 1) * filters.limit;

    const baseQuery = this.db
      .select({
        id: feedbacks.id,
        tenantId: feedbacks.tenantId,
        sessionId: feedbacks.sessionId,
        tableId: feedbacks.tableId,
        tableName: tables.name,
        customerName: feedbacks.customerName,
        overallRating: feedbacks.overallRating,
        comment: feedbacks.comment,
        createdAt: feedbacks.createdAt,
      })
      .from(feedbacks)
      .leftJoin(tables, eq(feedbacks.tableId, tables.id));

    const [list, [totalRow]] = await Promise.all([
      (whereClause ? baseQuery.where(whereClause) : baseQuery)
        .orderBy(desc(feedbacks.createdAt))
        .limit(filters.limit)
        .offset(offset),
      whereClause
        ? this.db.select({ total: count() }).from(feedbacks).where(whereClause)
        : this.db.select({ total: count() }).from(feedbacks),
    ]);

    const feedbackIds = list.map((f) => f.id);
    let itemsByFeedback: Record<
      string,
      {
        id: string;
        menuId: string;
        menuName: string;
        rating: number;
        comment: string | null;
      }[]
    > = {};

    if (feedbackIds.length > 0) {
      const ratedItems = await this.db
        .select({
          id: feedbackMenuRatings.id,
          feedbackId: feedbackMenuRatings.feedbackId,
          menuId: feedbackMenuRatings.menuId,
          menuName: menus.name,
          rating: feedbackMenuRatings.rating,
          comment: feedbackMenuRatings.comment,
        })
        .from(feedbackMenuRatings)
        .innerJoin(menus, eq(feedbackMenuRatings.menuId, menus.id))
        .where(inArray(feedbackMenuRatings.feedbackId, feedbackIds));

      for (const item of ratedItems) {
        const list = itemsByFeedback[item.feedbackId] ?? [];
        list.push({
          id: item.id,
          menuId: item.menuId,
          menuName: item.menuName,
          rating: item.rating,
          comment: item.comment,
        });
        itemsByFeedback[item.feedbackId] = list;
      }
    }

    const total = Number(totalRow?.total ?? 0);
    const totalPages = Math.ceil(total / filters.limit) || 1;

    return {
      items: list.map((f) => ({
        ...f,
        items: itemsByFeedback[f.id] ?? [],
      })),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages,
      },
    };
  }

  async getSummary(tenantId?: string) {
    const whereClause = tenantId ? eq(feedbacks.tenantId, tenantId) : undefined;

    const [stats] = await (whereClause
      ? this.db
          .select({
            totalReviews: count(),
            avgRating: avg(feedbacks.overallRating),
          })
          .from(feedbacks)
          .where(whereClause)
      : this.db
          .select({
            totalReviews: count(),
            avgRating: avg(feedbacks.overallRating),
          })
          .from(feedbacks));

    // Distribution: count per rating (1..5)
    const distributionQuery = this.db
      .select({
        rating: feedbacks.overallRating,
        count: count(),
      })
      .from(feedbacks);

    const distribution = await (whereClause
      ? distributionQuery.where(whereClause)
      : distributionQuery
    )
      .groupBy(feedbacks.overallRating)
      .orderBy(desc(feedbacks.overallRating));

    // Menu ratings summary
    const menuRatingsQuery = this.db
      .select({
        menuId: feedbackMenuRatings.menuId,
        menuName: menus.name,
        avgRating: avg(feedbackMenuRatings.rating),
        totalRatings: count(),
      })
      .from(feedbackMenuRatings)
      .innerJoin(menus, eq(feedbackMenuRatings.menuId, menus.id))
      .innerJoin(feedbacks, eq(feedbackMenuRatings.feedbackId, feedbacks.id));

    const menuStats = await (whereClause
      ? menuRatingsQuery.where(whereClause)
      : menuRatingsQuery
    )
      .groupBy(feedbackMenuRatings.menuId, menus.name)
      .orderBy(desc(count()))
      .limit(10);

    return {
      totalReviews: Number(stats?.totalReviews ?? 0),
      averageRating: stats?.avgRating ? Number(Number(stats.avgRating).toFixed(1)) : 0,
      distribution: [5, 4, 3, 2, 1].map((r) => {
        const found = distribution.find((d) => d.rating === r);
        return { rating: r, count: Number(found?.count ?? 0) };
      }),
      menuRatings: menuStats.map((m) => ({
        menuId: m.menuId,
        menuName: m.menuName,
        avgRating: m.avgRating ? Number(Number(m.avgRating).toFixed(1)) : 0,
        totalRatings: Number(m.totalRatings ?? 0),
      })),
    };
  }
}
