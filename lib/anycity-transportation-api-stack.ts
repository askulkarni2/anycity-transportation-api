import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib/core';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';

export class AnycityTransportationApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'vpc');

    // RDS
    const database = new rds.ServerlessCluster(this, 'database', {
      engine: rds.DatabaseClusterEngine.AURORA,
      vpc,
      enableDataApi: true,
    });

    // Lambda

    // API Gateway
  }
}
