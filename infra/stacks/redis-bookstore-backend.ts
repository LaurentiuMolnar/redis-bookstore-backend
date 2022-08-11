import * as path from 'node:path';

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime as LambdaRuntime } from 'aws-cdk-lib/aws-lambda';

console.log('cwd: ', process.cwd());

export class RedisBookstoreStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const booksService = new NodejsFunction(this, 'books-service', {
      runtime: LambdaRuntime.NODEJS_16_X,
      memorySize: 1024,
      handler: 'handler',
      entry: path.resolve(process.cwd(), 'src', 'books-service', 'index.ts'),
      functionName: 'books-service',
    });

    new cdk.CfnOutput(this, 'books-service-url', {
      value: booksService.functionName,
      exportName: 'books-service-url',
    });
  }
}
