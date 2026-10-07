import {
  json,
  query,
  withAdmin,
} from "@/lib/server/http";
import { listOrders } from "@/lib/server/orders";
import type {
  DeliveryType,
  OrderStatus,
  PaymentStatus,
} from "@/types/order";

export const GET = withAdmin(async ({ searchParams }) =>
  json(
    await listOrders({
      search: query.str(searchParams, "search"),
      status: query.str(
        searchParams,
        "status"
      ) as OrderStatus | "",
      paymentStatus: query.str(
        searchParams,
        "paymentStatus"
      ) as PaymentStatus | "",
      deliveryType: query.str(
        searchParams,
        "deliveryType"
      ) as DeliveryType | "",
      shopkeeperId: query.str(
        searchParams,
        "shopkeeperId"
      ),
      userId: query.str(searchParams, "userId"),
      sortBy: query.str(
        searchParams,
        "sortBy",
        "createdAt"
      ),
      sortDir:
        query.str(searchParams, "sortDir") ===
        "asc"
          ? "asc"
          : "desc",
      page: query.int(searchParams, "page", 1),
      pageSize: query.int(
        searchParams,
        "pageSize",
        10
      ),
    })
  )
);
