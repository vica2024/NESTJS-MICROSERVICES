import axios, { AxiosInstance } from 'axios';

export interface ShopifyAdminApiConfig {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string; // 默认 2024-01
}

/**
 * Shopify Admin API GraphQL Client
 * 用于客户标签操作
 */
export class ShopifyAdminApiClient {
  private client: AxiosInstance;
  private shopDomain: string;
  private accessToken: string;
  private apiVersion: string;

  constructor(config: ShopifyAdminApiConfig) {
    this.shopDomain = config.shopDomain;
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion || '2024-01';

    this.client = axios.create({
      baseURL: `https://${this.shopDomain}/admin/api/${this.apiVersion}/graphql.json`,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
      },
      timeout: 10000,
    });
  }

  /**
   * 为客户添加 tag
   * 幂等: 如果 tag 已存在，不产生错误
   */
  async addCustomerTag(shopifyCustomerId: string, tag: string): Promise<{
    success: boolean;
    tags: string[];
    error?: string;
  }> {
    const mutation = `
      mutation AddCustomerTag($input: CustomerInput!) {
        customerUpdate(input: $input) {
          customer {
            id
            tags
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    try {
      const response = await this.client.post('', {
        query: mutation,
        variables: {
          input: {
            id: `gid://shopify/Customer/${shopifyCustomerId}`,
            tags: [tag],
          },
        },
      });

      const data = response.data?.data?.customerUpdate;

      if (data?.userErrors?.length > 0) {
        const errorMsg = data.userErrors.map((e: any) => `${e.field}: ${e.message}`).join('; ');
        return {
          success: false,
          tags: [],
          error: errorMsg,
        };
      }

      const tags = data?.customer?.tags || [];
      return {
        success: true,
        tags,
      };
    } catch (error: any) {
      const errorMsg = error?.response?.data?.errors?.[0]?.message || error.message;
      return {
        success: false,
        tags: [],
        error: errorMsg,
      };
    }
  }

  /**
   * 从客户移除 tag
   * 幂等: 如果 tag 不存在，不产生错误
   */
  async removeCustomerTag(shopifyCustomerId: string, tag: string): Promise<{
    success: boolean;
    tags: string[];
    error?: string;
  }> {
    // 先获取当前 tags
    const getCurrentTags = `
      query GetCustomer($id: ID!) {
        customer(id: $id) {
          tags
        }
      }
    `;

    try {
      // 获取当前 tags
      const getResponse = await this.client.post('', {
        query: getCurrentTags,
        variables: {
          id: `gid://shopify/Customer/${shopifyCustomerId}`,
        },
      });

      let currentTags = getResponse.data?.data?.customer?.tags || [];
      currentTags = Array.isArray(currentTags) ? currentTags : [];

      // 过滤掉要移除的 tag
      const newTags = currentTags.filter((t: string) => t !== tag);

      // 如果没有变化，直接返回成功
      if (newTags.length === currentTags.length) {
        return {
          success: true,
          tags: newTags,
        };
      }

      // 执行更新
      const mutation = `
        mutation UpdateCustomerTags($input: CustomerInput!) {
          customerUpdate(input: $input) {
            customer {
              id
              tags
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const updateResponse = await this.client.post('', {
        query: mutation,
        variables: {
          input: {
            id: `gid://shopify/Customer/${shopifyCustomerId}`,
            tags: newTags,
          },
        },
      });

      const data = updateResponse.data?.data?.customerUpdate;

      if (data?.userErrors?.length > 0) {
        const errorMsg = data.userErrors.map((e: any) => `${e.field}: ${e.message}`).join('; ');
        return {
          success: false,
          tags: [],
          error: errorMsg,
        };
      }

      const tags = data?.customer?.tags || [];
      return {
        success: true,
        tags,
      };
    } catch (error: any) {
      const errorMsg = error?.response?.data?.errors?.[0]?.message || error.message;
      return {
        success: false,
        tags: [],
        error: errorMsg,
      };
    }
  }

  /**
   * 同步客户 tag (幂等操作)
   * 
   * @param shopifyCustomerId Shopify 客户 ID
   * @param shouldBePro true = 确保有 pro tag, false = 确保没有 pro tag
   */
  async syncCustomerTag(shopifyCustomerId: string, shouldBePro: boolean): Promise<{
    success: boolean;
    tags: string[];
    action: 'added' | 'removed' | 'no-change';
    error?: string;
  }> {
    const PRO_TAG = 'pro';

    if (shouldBePro) {
      const result = await this.addCustomerTag(shopifyCustomerId, PRO_TAG);
      if (!result.success) {
        return { ...result, action: 'no-change' };
      }
      // 判断是否真的添加了
      const hadTag = result.tags.includes(PRO_TAG);
      return {
        ...result,
        action: hadTag ? 'no-change' : 'added',
      };
    } else {
      const result = await this.removeCustomerTag(shopifyCustomerId, PRO_TAG);
      if (!result.success) {
        return { ...result, action: 'no-change' };
      }
      // 判断是否真的移除了
      const hasTag = result.tags.includes(PRO_TAG);
      return {
        ...result,
        action: hasTag ? 'no-change' : 'removed',
      };
    }
  }
}

export default ShopifyAdminApiClient;
