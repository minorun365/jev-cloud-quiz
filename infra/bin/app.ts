#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AppStack } from '../lib/app-stack.js';

const app = new cdk.App();

// Jev の API は米国側にあるため、判定の往復を最短にする目的でオレゴンへ置く。
// 画面の配信は CloudFront の東京エッジから届くので、表示の速さには影響しない。
const region = 'us-west-2';

new AppStack(app, 'JevClassifier', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region },
  apiKeyParameterName: app.node.tryGetContext('apiKeyParameterName')
    ?? '/jev-classifier/typesafe-api-key',
  description: 'Jev クラウド判定デモの配信基盤',
});

cdk.Tags.of(app).add('Project', 'jev-classifier');
cdk.Tags.of(app).add('ManagedBy', 'cdk-cdkd');
