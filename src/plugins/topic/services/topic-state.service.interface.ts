import type { BatchDataItem } from '@/core/types/shared.types';
import type { TopicData } from '@/plugins/topic/schema';

export interface TopicStateService {
  saveTopic(key: string, topicData: TopicData): void;
  loadTopic(key: string): TopicData | null;
  listTopics(): TopicData[];
  deleteTopic(key: string): void;

  applyTopicCreateFromBatchItem(item: BatchDataItem): Promise<void>;
  applyTopicUpdateFromBatchItem(item: BatchDataItem): Promise<void>;
  applyTopicDeleteFromBatchItem(item: BatchDataItem): Promise<void>;
}
