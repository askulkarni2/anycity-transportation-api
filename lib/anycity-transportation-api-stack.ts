import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Tracing } from 'aws-cdk-lib/aws-lambda';
import * as waf from 'aws-cdk-lib/aws-wafv2';
export class AnycityTransportationApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'vpc');

    // RDS
    const defaultDatabaseName = "schedules";
    const rdsDatabase = new rds.ServerlessCluster(this, 'database', {
      engine: rds.DatabaseClusterEngine.AURORA,
      vpc,
      enableDataApi: true,
      defaultDatabaseName,
      scaling: {
        autoPause: Duration.days(1),
      }
    });

    // Lambda Functions
    const environment = {
      CLUSTER: rdsDatabase.clusterArn,
      SECRET: rdsDatabase.secret!.secretArn,
      DATABASE: defaultDatabaseName
    };

    const busFunction = new lambda.NodejsFunction(this, 'bus', {
      environment,
      timeout: Duration.minutes(1),
      tracing: Tracing.ACTIVE
    });

    const subwayFunction = new lambda.NodejsFunction(this, 'subway', {
      environment,
      timeout: Duration.minutes(1),
      tracing: Tracing.ACTIVE
    });

    // Grant RDS Access to Lambda functions
    rdsDatabase.grantDataApiAccess(busFunction);
    rdsDatabase.grantDataApiAccess(subwayFunction);
  
    // API Gateway
    const prdLogGroup = new logs.LogGroup(this, "PrdLogs");
    const api = new apigateway.RestApi(this, 'api', {
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(prdLogGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
        cachingEnabled: true,
        metricsEnabled: true,
        tracingEnabled: true,
      }
    });

    const plan = api.addUsagePlan('UsagePlan', {
      name: 'Easy',
      throttle: {
        rateLimit: 10,
        burstLimit: 2
      }
    });
    
    const key = api.addApiKey('ApiKey');
    plan.addApiKey(key);
    plan.addApiStage({
      stage: api.deploymentStage
    });

    const busResource = api.root.addResource('bus');
    busResource.addMethod('GET', new apigateway.LambdaIntegration(busFunction), {
      apiKeyRequired: true
    });

    const subwayResource = api.root.addResource('subway');
    subwayResource.addMethod('GET', new apigateway.LambdaIntegration(subwayFunction), {
      apiKeyRequired: true
    });

    //Setup WAF Rules

    let wafRules:Array<waf.CfnWebACL.RuleProperty>  = [];

    // 1 AWS Managed Rules
    let awsManagedRules:waf.CfnWebACL.RuleProperty  = {
      name: 'AWS-AWSManagedRulesCommonRuleSet',
      priority: 1,
      overrideAction: {none: {}},
      statement: {
        managedRuleGroupStatement: {
          name: 'AWSManagedRulesCommonRuleSet',
          vendorName: 'AWS',
          excludedRules: [{name: 'SizeRestrictions_BODY'}]
        }
      },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'awsCommonRules',
        sampledRequestsEnabled: true
      }
    };

    wafRules.push(awsManagedRules);

    // Create our Web ACL
    let webACL = new waf.CfnWebACL(this, 'WebACL', {
      defaultAction: {
        allow: {}
      },
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'webACL',
        sampledRequestsEnabled: true,
      },
      rules: wafRules
    });

    // Associate with our gateway
    new waf.CfnWebACLAssociation(this, 'WebACLAssociation', {
      webAclArn: webACL.attrArn,
      resourceArn: `arn:aws:apigateway:${Stack.of(this).region}::/restapis/${api.restApiId}/stages/${api.deploymentStage.stageName}`
    });
  }
}