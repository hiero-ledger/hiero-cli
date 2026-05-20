import type { Logger, StateService } from '@/core';
import type { TopicStateService } from './topic-state.service.interface';

import { ValidationError } from '@/core/errors';
import { TOPIC_NAMESPACE } from '@/plugins/topic/constants';
import { safeParseTopicData, type TopicData } from '@/plugins/topic/schema';

export class TopicStateServiceImpl implements TopicStateService {
  private readonly namespace = TOPIC_NAMESPACE;

  constructor(
    private readonly state: StateService,
    private readonly logger: Logger,
  ) {}

  saveTopic(key: string, topicData: TopicData): void {
    this.logger.debug(`[TOPIC STATE] Saving topic: ${key}`);

    const validation = safeParseTopicData(topicData);
    if (!validation.success) {
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new ValidationError(`Invalid topic data: ${errors}`);
    }

    this.state.set(this.namespace, key, topicData);
    this.logger.debug(`[TOPIC STATE] Topic saved: ${key}`);
  }

  loadTopic(key: string): TopicData | null {
    this.logger.debug(`[TOPIC STATE] Loading topic: ${key}`);
    const data = this.state.get<TopicData>(this.namespace, key);

    if (data) {
      const validation = safeParseTopicData(data);
      if (!validation.success) {
        this.logger.warn(
          `[TOPIC STATE] Invalid data for topic: ${key}. Errors: ${validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        );
        return null;
      }
    }

    return data || null;
  }

  listTopics(): TopicData[] {
    this.logger.debug('[TOPIC STATE] Listing all topics');
    const allData = this.state.list<TopicData>(this.namespace);
    return allData.filter((data) => safeParseTopicData(data).success);
  }

  deleteTopic(key: string): void {
    this.logger.debug(`[TOPIC STATE] Deleting topic: ${key}`);
    this.state.delete(this.namespace, key);
  }
}
