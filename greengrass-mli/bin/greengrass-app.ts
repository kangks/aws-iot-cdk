#!/usr/bin/env node

import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import GreengrassConstruct from '../lib/greengrass-construct';
import LambdaConstruct from '../lib/lambda-construct';

class GreengrassStack extends cdk.Stack{
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambda = new LambdaConstruct(this, 'GreengrassLambda');

    const greengrassGroup = new GreengrassConstruct(this, 'GreenGrassGroup', {
        greengrassLambdaAlias: lambda.lambdaAlias,
        thingName: 'cdkThingName',
        certId: '', //<64 alphanumeric cert Id>,
        sageMakerJobArn: '' // SageMaker job arn
    });

    // Publish the custom resource output
    new cdk.CfnOutput(this, 'GreenGrassDeploymentCommand', {
      description: 'Greengrass Deployment command',
      value: greengrassGroup.deploymentCommand
    });
  }
}
const app = new cdk.App();
new GreengrassStack(app, 'GreengrassStack');
app.synth();
