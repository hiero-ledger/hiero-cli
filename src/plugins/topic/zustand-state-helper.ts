/**
 * Zustand-based Topic State Helper
 * Provides rich state management with subscriptions and actions
 */
import type { Logger, StateService } from '@/core';
import type { SupportedNetwork } from '@/core/types/shared.types';

import { TOPIC_NAMESPACE } from './manifest';
import { safeParseTopicData, type TopicData } from './schema';

export class ZustandTopicStateHelper {
  private state: StateService;
  private logger: Logger;
  private namespace: string;
  private unsubscribe?: () => void;

  constructor(state: StateService, logger: Logger) {
    this.state = state;
    this.logger = logger;
    this.namespace = TOPIC_NAMESPACE;
  }

  /**
   * Save topic with validation
   */
  saveTopic(name: string, topicData: TopicData): void {
    this.logger.debug(`[ZUSTAND TOPIC STATE] Saving topic: ${name}`);

    const validation = safeParseTopicData(topicData);
    if (!validation.success) {
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new Error(`Invalid topic data: ${errors}`);
    }

    this.state.set(this.namespace, name, topicData);
    this.logger.debug(`[ZUSTAND TOPIC STATE] Topic saved: ${name}`);
  }

  /**
   * Load topic with validation
   */
  loadTopic(name: string): TopicData | null {
    this.logger.debug(`[ZUSTAND TOPIC STATE] Loading topic: ${name}`);
    const data = this.state.get<TopicData>(this.namespace, name);

    if (data) {
      const validation = safeParseTopicData(data);
      if (!validation.success) {
        this.logger.warn(
          `[ZUSTAND TOPIC STATE] Invalid data for topic: ${name}. Errors: ${validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        );
        return null;
      }
    }

    return data || null;
  }

  /**
   * List all topics with validation
   */
  listTopics(): TopicData[] {
    this.logger.debug(`[ZUSTAND TOPIC STATE] Listing all topics`);
    const allData = this.state.list<TopicData>(this.namespace);
    return allData.filter((data) => safeParseTopicData(data).success);
  }

  /**
   * Delete topic
   */
  deleteTopic(name: string): void {
    this.logger.debug(`[ZUSTAND TOPIC STATE] Deleting topic: ${name}`);
    this.state.delete(this.namespace, name);
  }

  /**
   * Clear all topics
   */
  clearTopics(): void {
    this.logger.debug(`[ZUSTAND TOPIC STATE] Clearing all topics`);
    this.state.clear(this.namespace);
  }

  /**
   * Check if topic exists
   */
  hasTopic(name: string): boolean {
    this.logger.debug(
      `[ZUSTAND TOPIC STATE] Checking if topic exists: ${name}`,
    );
    return this.state.has(this.namespace, name);
  }

  /**
   * Get topic count
   */
  getTopicCount(): number {
    const topics = this.listTopics();
    return topics.length;
  }

  /**
   * Get topics by network
   */
  getTopicsByNetwork(network: SupportedNetwork): TopicData[] {
    const topics = this.listTopics();
    return topics.filter((topic) => topic.network === network);
  }

  /**
   * Find topic by topic ID
   */
  findTopicByTopicId(topicId: string): TopicData | null {
    const topics = this.listTopics();
    return topics.find((topic) => topic.topicId === topicId) || null;
  }

  /**
   * Subscribe to topic changes
   */
  subscribeToTopics(callback: (topics: TopicData[]) => void): () => void {
    this.logger.debug(`[ZUSTAND TOPIC STATE] Subscribing to topic changes`);

    this.unsubscribe = this.state.subscribe<TopicData>(
      this.namespace,
      (data) => {
        const validTopics = data.filter(
          (topic) => safeParseTopicData(topic).success,
        );
        callback(validTopics);
      },
    );

    return () => {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.logger.debug(
          `[ZUSTAND TOPIC STATE] Unsubscribed from topic changes`,
        );
      }
    };
  }

  /**
   * Get Zustand store actions for advanced usage
   */
  getStoreActions(): unknown {
    return this.state.getActions(this.namespace);
  }

  /**
   * Get Zustand store state for advanced usage
   */
  getStoreState(): unknown {
    return this.state.getState(this.namespace);
  }

  /**
   * Get all keys in the namespace
   */
  getTopicNames(): string[] {
    return this.state.getKeys(this.namespace);
  }

  /**
   * Batch operations
   */
  batchSaveTopics(topics: Array<{ name: string; data: TopicData }>): void {
    this.logger.debug(
      `[ZUSTAND TOPIC STATE] Batch saving ${topics.length} topics`,
    );

    for (const { name, data } of topics) {
      this.saveTopic(name, data);
    }
  }

  /**
   * Batch delete topics
   */
  batchDeleteTopics(names: string[]): void {
    this.logger.debug(
      `[ZUSTAND TOPIC STATE] Batch deleting ${names.length} topics`,
    );

    for (const name of names) {
      this.deleteTopic(name);
    }
  }

  /**
   * Search topics by criteria
   */
  searchTopics(criteria: {
    network?: string;
    hasAdminKey?: boolean;
    hasSubmitKey?: boolean;
    memo?: string;
  }): TopicData[] {
    let topics = this.listTopics();

    if (criteria.network) {
      topics = topics.filter((topic) => topic.network === criteria.network);
    }

    if (criteria.hasAdminKey !== undefined) {
      topics = topics.filter(
        (topic) => Boolean(topic.adminKeyRefId) === criteria.hasAdminKey,
      );
    }

    if (criteria.hasSubmitKey !== undefined) {
      topics = topics.filter(
        (topic) => Boolean(topic.submitKeyRefId) === criteria.hasSubmitKey,
      );
    }

    if (criteria.memo) {
      const pattern = new RegExp(criteria.memo, 'i');
      topics = topics.filter((topic) => topic.memo && pattern.test(topic.memo));
    }

    return topics;
  }

  /**
   * Get topic statistics
   */
  getTopicStats(): {
    total: number;
    byNetwork: Record<string, number>;
    withAdminKey: number;
    withSubmitKey: number;
    withMemo: number;
  } {
    const topics = this.listTopics();

    const stats = {
      total: topics.length,
      byNetwork: {} as Record<string, number>,
      withAdminKey: 0,
      withSubmitKey: 0,
      withMemo: 0,
    };

    for (const topic of topics) {
      stats.byNetwork[topic.network] =
        (stats.byNetwork[topic.network] || 0) + 1;

      if (topic.adminKeyRefId) stats.withAdminKey++;
      if (topic.submitKeyRefId) stats.withSubmitKey++;
      if (topic.memo) stats.withMemo++;
    }

    return stats;
  }
}
