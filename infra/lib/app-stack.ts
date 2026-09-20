import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import type { Construct } from 'constructs';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export interface AppStackProps extends cdk.StackProps {
  /** Jev の API キーを入れた SecureString パラメータ名 */
  readonly apiKeyParameterName: string;
}

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const web = new lambda.DockerImageFunction(this, 'Web', {
      functionName: 'jev-cloud-classifier',
      code: lambda.DockerImageCode.fromImageAsset(path.join(currentDir, '../..'), {
        file: 'infra/Dockerfile',
        platform: cdk.aws_ecr_assets.Platform.LINUX_ARM64,
        exclude: ['.git', '.github', 'node_modules', 'cdk.out', 'dist', 'docs'],
        ignoreMode: cdk.IgnoreMode.GLOB,
      }),
      architecture: lambda.Architecture.ARM_64,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(20),
      environment: {
        AWS_LWA_PORT: '8080',
        TYPESAFE_API_KEY_PARAMETER: props.apiKeyParameterName,
      },
      logGroup: new cdk.aws_logs.LogGroup(this, 'WebLogs', {
        retention: cdk.aws_logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    web.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [this.formatArn({
        service: 'ssm',
        resource: 'parameter',
        resourceName: props.apiKeyParameterName.replace(/^\//, ''),
      })],
    }));

    const functionUrl = web.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
      invokeMode: lambda.InvokeMode.BUFFERED,
    });
    const origin = origins.FunctionUrlOrigin.withOriginAccessControl(functionUrl);

    // 静的資産は Lambda 側が付けた Cache-Control をそのまま尊重させる
    const originAwareCache = new cloudfront.CachePolicy(this, 'OriginAwareCache', {
      cachePolicyName: 'jev-classifier-origin-cache-control',
      minTtl: cdk.Duration.seconds(0),
      defaultTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.days(365),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: 'Jev クラウド判定デモ',
      defaultBehavior: {
        origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: originAwareCache,
        compress: true,
      },
      additionalBehaviors: {
        'api/*': {
          origin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          // Host を転送すると Function URL 側の署名検証が崩れる
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          compress: true,
        },
      },
      enableIpv6: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
    });

    // 2025年10月以降、AWS_IAM で保護した Function URL は InvokeFunctionUrl に加えて
    // InvokeFunction も要る。前者は FunctionUrlOrigin が付けるので、後者をここで足す。
    web.addPermission('CloudFrontInvokeFunction', {
      principal: new iam.ServicePrincipal('cloudfront.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: this.formatArn({
        service: 'cloudfront',
        region: '',
        resource: 'distribution',
        resourceName: distribution.distributionId,
      }),
      invokedViaFunctionUrl: true,
    });

    new cdk.CfnOutput(this, 'ApplicationUrl', {
      value: `https://${distribution.distributionDomainName}`,
    });
  }
}
