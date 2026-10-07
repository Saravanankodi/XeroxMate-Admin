import { NextRequest, NextResponse } from "next/server";
import {
  getWalletSummary,
  getWalletEntries,
  getWithdrawals,
  WalletError,
} from "@/lib/wallet";

export async function GET(request: NextRequest) {
  try {
    const shopId = request.nextUrl.searchParams.get("shopId");
    const uid = request.nextUrl.searchParams.get("uid");

    if (!shopId || !uid) {
      return NextResponse.json(
        {
          error: "shopId and uid are required.",
        },
        { status: 400 },
      );
    }

    const summary = await getWalletSummary(
      shopId,
      uid,
    );

    const entries = await getWalletEntries(
      shopId,
    );

    const withdrawals = await getWithdrawals(
      shopId,
    );

    return NextResponse.json({
      summary,
      entries,
      withdrawals,
    });
  } catch (error) {
    if (error instanceof WalletError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("GET /api/wallet failed:", error);

    return NextResponse.json(
      { error: "Unable to load wallet." },
      { status: 500 },
    );
  }
}
