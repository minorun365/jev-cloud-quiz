export type Cloud = 'aws' | 'azure' | 'google_cloud';

export interface Question {
  /** Jev へ渡す機能名。説明や番号を混ぜると精度が落ちるので、名前だけを入れる */
  name: string;
  answer: Cloud;
}

export const CLOUDS: { id: Cloud; label: string }[] = [
  { id: 'aws', label: 'AWS' },
  { id: 'azure', label: 'Azure' },
  { id: 'google_cloud', label: 'Google Cloud' },
];

/** ブランド名がついた素直な出題 */
const PLAIN: Question[] = [
  { name: 'Amazon S3', answer: 'aws' },
  { name: 'Amazon DynamoDB', answer: 'aws' },
  { name: 'AWS Lambda', answer: 'aws' },
  { name: 'Azure Blob Storage', answer: 'azure' },
  { name: 'Azure Cosmos DB', answer: 'azure' },
  { name: 'Azure Kubernetes Service', answer: 'azure' },
  { name: 'Google Cloud Storage', answer: 'google_cloud' },
  { name: 'Google Kubernetes Engine', answer: 'google_cloud' },
  { name: 'Google BigQuery', answer: 'google_cloud' },
];

/** ブランド名を外した出題。三社で似た名前が並ぶものを選んである */
const TRICKY: Question[] = [
  { name: 'Fargate', answer: 'aws' },
  { name: 'Container Apps', answer: 'azure' },
  { name: 'Cloud Run', answer: 'google_cloud' },
  { name: 'EventBridge', answer: 'aws' },
  { name: 'Event Grid', answer: 'azure' },
  { name: 'Pub/Sub', answer: 'google_cloud' },
  { name: 'Athena', answer: 'aws' },
  { name: 'Synapse Analytics', answer: 'azure' },
  { name: 'Looker', answer: 'google_cloud' },
  { name: 'Step Functions', answer: 'aws' },
  { name: 'Logic Apps', answer: 'azure' },
  { name: 'Workflows', answer: 'google_cloud' },
  { name: 'CloudFront', answer: 'aws' },
  { name: 'Front Door', answer: 'azure' },
  { name: 'Cloud CDN', answer: 'google_cloud' },
  { name: 'Route 53', answer: 'aws' },
  { name: 'Traffic Manager', answer: 'azure' },
  { name: 'Cloud DNS', answer: 'google_cloud' },
  { name: 'Cognito', answer: 'aws' },
  { name: 'Entra ID', answer: 'azure' },
  { name: 'Identity Platform', answer: 'google_cloud' },
  { name: 'Aurora', answer: 'aws' },
  { name: 'Cosmos DB', answer: 'azure' },
  { name: 'Spanner', answer: 'google_cloud' },
  { name: 'Bedrock', answer: 'aws' },
  { name: 'AI Foundry', answer: 'azure' },
  { name: 'Vertex AI', answer: 'google_cloud' },
  { name: 'App Runner', answer: 'aws' },
  { name: 'Fabric', answer: 'azure' },
  { name: 'Firestore', answer: 'google_cloud' },
];

export const QUESTIONS: Question[] = [...PLAIN, ...TRICKY];

export function shuffled(): Question[] {
  const list = [...QUESTIONS];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
