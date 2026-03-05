/**
 * Zustand-based Topic State Helper
 * Provides rich state management with subscriptions and actions
 */
import type { Logger, StateService } from '@/core';

import { ValidationError } from '@/core/errors';

import { TOPIC_NAMESPACE } from './manifest';
import { safeParseTopicData, type TopicData } from './schema';

export class ZustandTopicStateHelper {
  private state: StateService;
  private logger: Logger;
  private namespace: string;

  constructor(state: StateService, logger: Logger) {
    this.state = state;
    this.logger = logger;
    this.namespace = TOPIC_NAMESPACE;
  }

  /**
   * Save topic with validation
   */
  saveTopic(key: string, topicData: TopicData): void {
    this.logger.debug(`[ZUSTAND TOPIC STATE] Saving topic: ${key}`);

    const validation = safeParseTopicData(topicData);
    if (!validation.success) {
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new ValidationError(`Invalid topic data: ${errors}`);
    }

    this.state.set(this.namespace, key, topicData);
    this.logger.debug(`[ZUSTAND TOPIC STATE] Topic saved: ${key}`);
  }

  /**
   * Load topic with validation
   */
  loadTopic(key: string): TopicData | null {
    this.logger.debug(`[ZUSTAND TOPIC STATE] Loading topic: ${key}`);
    const data = this.state.get<TopicData>(this.namespace, key);

    if (data) {
      const validation = safeParseTopicData(data);
      if (!validation.success) {
        this.logger.warn(
          `[ZUSTAND TOPIC STATE] Invalid data for topic: ${key}. Errors: ${validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
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
  deleteTopic(key: string): void {
    this.logger.debug(`[ZUSTAND TOPIC STATE] Deleting topic: ${key}`);
    this.state.delete(this.namespace, key);
  }
}
