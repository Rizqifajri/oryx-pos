import type { Request, Response } from "express";
import * as paymentService from "./payment.service";

export const createPublicPayment = async (req: Request, res: Response) => {
  const data = await paymentService.createPublicSnapToken(
    req.body.orderId,
  );
  res.status(201).json({ success: true, data });
};

export const createPayment = async (req: Request, res: Response) => {
  const data = await paymentService.createSnapToken(
    req.userContext!,
    req.body.orderId,
  );
  res.status(201).json({ success: true, data });
};

export const handleWebhook = async (req: Request, res: Response) => {
  const result = await paymentService.handleWebhook(req.body);
  res.status(200).json(result);
};

export const getPaymentRequest = async (req: Request, res: Response) => {
  const payment = await paymentService.getPaymentRequest(
    req.userContext!,
    req.params.id,
  );
  res.json(payment);
};

export const getPaymentRequestByOrder = async (req: Request, res: Response) => {
  const payment = await paymentService.getPaymentRequestByOrder(
    req.userContext!,
    req.params.orderId,
  );
  res.json(payment);
};

export const listPaymentRequests = async (req: Request, res: Response) => {
  const payments = await paymentService.listPaymentRequests(req.userContext!, {
    tenantId: req.query.tenantId as string | undefined,
  });
  res.json(payments);
};
