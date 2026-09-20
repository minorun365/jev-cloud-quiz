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

// ブランド名（Amazon / AWS / Azure / Google）は外してある。
// 三社で役割の似たものを揃えてあるので、名前だけでは判別しにくい。
const AWS: string[] = [
  'Lambda',
  'S3',
  'DynamoDB',
  'Aurora',
  'Fargate',
  'EventBridge',
  'Step Functions',
  'Athena',
  'CloudFront',
  'AgentCore',
];

const AZURE: string[] = [
  'Blob Storage',
  'Cosmos DB',
  'Container Apps',
  'Event Grid',
  'Logic Apps',
  'Synapse Analytics',
  'Front Door',
  'Entra ID',
  'Fabric',
  'Hosted Agent',
];

const GOOGLE: string[] = [
  'Cloud Storage',
  'Spanner',
  'Firestore',
  'Cloud Run',
  'Pub/Sub',
  'Workflows',
  'BigQuery',
  'Cloud CDN',
  'Vertex AI',
  'Agent Engine',
];

export const QUESTIONS: Question[] = [
  ...AWS.map((name) => ({ name, answer: 'aws' as const })),
  ...AZURE.map((name) => ({ name, answer: 'azure' as const })),
  ...GOOGLE.map((name) => ({ name, answer: 'google_cloud' as const })),
];

export function shuffled(): Question[] {
  const list = [...QUESTIONS];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
