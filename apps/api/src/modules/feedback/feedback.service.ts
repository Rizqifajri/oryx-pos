import { Injectable } from "@nestjs/common";
import { AppError } from "../../common/errors/app-error";
import type { UserContext } from "../../common/types/user-context";
import { FeedbackRepository } from "./feedback.repository";
import type {
  CreateFeedbackInput,
  FeedbackQueryInput,
} from "./feedback.schema";

@Injectable()
export class FeedbackService {
  constructor(private readonly feedbackRepo: FeedbackRepository) {}

  async createFeedback(
    data: CreateFeedbackInput,
    tenantIdFromContext?: string,
  ) {
    const tenantId = data.tenantId || tenantIdFromContext;
    if (!tenantId) {
      throw new AppError("Tenant ID is required for feedback", 400);
    }

    return await this.feedbackRepo.createFeedback({
      ...data,
      tenantId,
    });
  }

  async listFeedbacks(ctx: UserContext, query: FeedbackQueryInput) {
    let tenantIdToUse: string | undefined;

    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) throw new AppError("Tenant context required", 400);
      tenantIdToUse = ctx.tenantId;
    } else if (query.tenantId) {
      tenantIdToUse = query.tenantId;
    }

    return await this.feedbackRepo.findFeedbacksPaginated({
      tenantId: tenantIdToUse,
      overallRating: query.overallRating,
      page: query.page,
      limit: query.limit,
    });
  }

  async getSummary(ctx: UserContext, tenantId?: string) {
    let tenantIdToUse: string | undefined;

    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) throw new AppError("Tenant context required", 400);
      tenantIdToUse = ctx.tenantId;
    } else if (tenantId) {
      tenantIdToUse = tenantId;
    }

    return await this.feedbackRepo.getSummary(tenantIdToUse);
  }
}

