import cfn = require('@aws-cdk/aws-cloudformation');
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/core');

import * as path from 'path';
import { CustomResourceProvider, CustomResource } from '@aws-cdk/aws-cloudformation';
import { PolicyStatement } from '@aws-cdk/aws-iam';
import fs = require('fs');

export interface GreengrassDeploymentResetResourceProps {
    groupId: string,
    groupArn: string
}

export class GreengrassDeploymentResetResource extends cdk.Construct {
  public readonly response: string;

  constructor(scope: cdk.Construct, id: string, props: GreengrassDeploymentResetResourceProps) {
    super(scope, id);

    const codeLocation = path.resolve(__dirname, '..', 'lambda_functions', 'cfn_custom_resources');

    const customHandler = new lambda.SingletonFunction(this, 'GreengrassGroupRemovalHandler', {
        uuid: 'ef824515-21c3-4243-a0b8-d7f60fe544b7',
        code: new lambda.AssetCode(codeLocation),
        handler: 'group_deployment_reset.handler',
        timeout: cdk.Duration.seconds(300),
        runtime: lambda.Runtime.PYTHON_3_7,
      })

    customHandler.addToRolePolicy(new PolicyStatement({
        actions: [ 'greengrass:*' ],
        resources: [ '*' ],
     }));

    const provider = CustomResourceProvider.lambda(customHandler)

    const resource = new CustomResource(this, 'GroupRemovalHandler', {
        provider,
        resourceType: 'Custom::AutoDeleteGreengrassGroup',
        properties: props
    });

    this.response = resource.getAtt('Response').toString();    
  }
}

