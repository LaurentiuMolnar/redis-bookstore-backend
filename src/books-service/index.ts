import type { APIGatewayProxyResultV2 } from 'aws-lambda';

export async function handler(): Promise<APIGatewayProxyResultV2> {
  return {
    statusCode: 200,
    body: JSON.stringify('hello, world!'),
  };
}
