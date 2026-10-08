import { computeChatCost } from '@lobechat/model-runtime/computeChatCost';
import type { ModelUsage } from '@lobechat/types';
import type { Pricing } from 'model-bank';
import { describe, expect, it } from 'vitest';

import { getUsageUsdCost } from './usageCost';

const tieredPricing = {
  currency: 'USD',
  units: [
    {
      name: 'textInput',
      strategy: 'tiered',
      tiers: [
        { rate: 2, upTo: 272_000 },
        { rate: 4, upTo: 'infinity' },
      ],
      unit: 'millionTokens',
    },
    { name: 'textInput_cacheRead', rate: 0.5, strategy: 'fixed', unit: 'millionTokens' },
    { name: 'textOutput', rate: 10, strategy: 'fixed', unit: 'millionTokens' },
  ],
} satisfies Pricing;

const usage = (overrides: ModelUsage): ModelUsage => ({
  outputTextTokens: 0,
  totalOutputTokens: 0,
  ...overrides,
});

describe('msm usage USD cost', () => {
  it('uses the cheap OpenAI tier under the threshold and the expensive tier above it', () => {
    const shortUsage = usage({
      inputCacheMissTokens: 1_000,
      totalInputTokens: 1_000,
      totalTokens: 1_000,
    });
    const longUsage = usage({
      inputCacheMissTokens: 300_000,
      totalInputTokens: 300_000,
      totalTokens: 300_000,
    });

    const shortCost = getUsageUsdCost(tieredPricing, shortUsage);
    const longCost = getUsageUsdCost(tieredPricing, longUsage);

    expect(shortCost?.total).toBeCloseTo(0.002, 6);
    expect(longCost?.total).toBeCloseTo(1.2, 6);
    expect(shortCost?.total).toBe(computeChatCost(tieredPricing, shortUsage)?.totalCost);
    expect(longCost?.total).toBe(computeChatCost(tieredPricing, longUsage)?.totalCost);
  });

  it('prices a cache read below the same number of uncached tokens', () => {
    const miss = usage({
      inputCacheMissTokens: 1_000,
      totalInputTokens: 1_000,
      totalTokens: 1_000,
    });
    const hit = usage({
      inputCacheMissTokens: 0,
      inputCachedTokens: 1_000,
      totalInputTokens: 1_000,
      totalTokens: 1_000,
    });

    const missCost = getUsageUsdCost(tieredPricing, miss);
    const hitCost = getUsageUsdCost(tieredPricing, hit);

    expect(hitCost?.inputCached).toBeLessThan(missCost?.inputCacheMiss ?? 0);
    expect(missCost?.total).toBe(computeChatCost(tieredPricing, miss)?.totalCost);
    expect(hitCost?.total).toBe(computeChatCost(tieredPricing, hit)?.totalCost);
  });

  it('prices a non-OpenAI fixed list in USD', () => {
    const pricing = {
      currency: 'USD',
      units: [
        { name: 'textInput', rate: 3, strategy: 'fixed', unit: 'millionTokens' },
        { name: 'textOutput', rate: 15, strategy: 'fixed', unit: 'millionTokens' },
      ],
    } satisfies Pricing;
    const tokens = usage({
      inputCacheMissTokens: 2_000,
      outputTextTokens: 100,
      totalInputTokens: 2_000,
      totalOutputTokens: 100,
      totalTokens: 2_100,
    });

    const cost = getUsageUsdCost(pricing, tokens);

    expect(cost?.total).toBeGreaterThan(0);
    expect(cost?.total).toBe(computeChatCost(pricing, tokens)?.totalCost);
  });

  it('converts a CNY price list to USD', () => {
    const pricing = {
      currency: 'CNY',
      units: [{ name: 'textInput', rate: 7.12, strategy: 'fixed', unit: 'millionTokens' }],
    } satisfies Pricing;
    const tokens = usage({
      inputCacheMissTokens: 1_000,
      totalInputTokens: 1_000,
      totalTokens: 1_000,
    });

    const cost = getUsageUsdCost(pricing, tokens);

    expect(cost?.total).toBeCloseTo(0.001, 6);
    expect(cost?.total).not.toBeCloseTo(0.00712, 5);
    expect(cost?.total).toBe(computeChatCost(pricing, tokens)?.totalCost);
  });
});
