import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionHandlerService } from './shopify/subscription.handler';

export interface WebhookHandler {
  handle(input: any): Promise<any>;
  supportsTopic(topic: string): boolean;
}

@Injectable()
export class WebhookHandlerFactory {
  private readonly logger = new Logger(WebhookHandlerFactory.name);

  constructor(private readonly subscriptionHandler: SubscriptionHandlerService) {}

  /**
   * 根据 topic 获取对应的 handler
   */
  getHandler(topic: string): WebhookHandler | null {
    if (this._isSubscriptionTopic(topic)) {
      return {
        handle: (input) => this.subscriptionHandler.handleSubscriptionEvent(input),
        supportsTopic: (t) => this._isSubscriptionTopic(t),
      };
    }

    this.logger.warn(`[HandlerFactory] No handler found for topic: ${topic}`);
    return null;
  }

  private _isSubscriptionTopic(topic: string): boolean {
    return (
      topic.includes('subscription') ||
      topic.includes('billing') ||
      topic.startsWith('billing_subscription_contracts/')
    );
  }
}
