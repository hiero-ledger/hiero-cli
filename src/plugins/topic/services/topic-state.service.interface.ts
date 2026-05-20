import type { TopicData } from '@/plugins/topic/schema';

export interface TopicStateService {
  saveTopic(key: string, topicData: TopicData): void;
  loadTopic(key: string): TopicData | null;
  listTopics(): TopicData[];
  deleteTopic(key: string): void;
}
