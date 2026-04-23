import { Injectable, Logger } from '@nestjs/common';

export interface SpApiListingPayload {
  title: string;
  bulletPoints: string[];
  description: string;
  price?: number;
}

export interface SpApiResponse {
  success: boolean;
  listingId: string;
  status: string;
  message: string;
}

@Injectable()
export class AmazonSpApiMock {
  private readonly logger = new Logger(AmazonSpApiMock.name);

  async submitListing(payload: SpApiListingPayload): Promise<SpApiResponse> {
    this.logger.log(`[MOCK SP-API] Submitting listing: ${payload.title}`);

    // Simulate API latency
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return {
      success: true,
      listingId: `MOCK-${Date.now()}`,
      status: 'PENDING_REVIEW',
      message: 'Mock listing submitted successfully. Pending Amazon review.',
    };
  }

  async getListingStatus(listingId: string): Promise<{ status: string; message: string }> {
    this.logger.log(`[MOCK SP-API] Checking status for: ${listingId}`);
    return { status: 'ACTIVE', message: 'Mock listing is active' };
  }
}
