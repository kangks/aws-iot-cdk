import lambda = require( '@aws-cdk/aws-lambda' )
import { Construct, RemovalPolicy, Duration } from '@aws-cdk/core'
import cfn = require( '@aws-cdk/aws-cloudformation' )
import path = require('path')
import cdk = require('@aws-cdk/core');
import greengrass = require('@aws-cdk/aws-greengrass');

export class AutoDeleteGreengrassGroup extends greengrass.CfnGroup {
  constructor(scope: Construct, id: string, props: greengrass.CfnGroupProps) {

    super(scope, id, {
      ...props
    })

    const codeLocation = path.resolve(__dirname, '..', 'lambda_functions', 'cfn_custom_resources');

    const customHandler = new lambda.SingletonFunction(this, 'GreenGrassGroupHandler', {
        uuid: `${cdk.Stack.name}-ef824515-21c3-4243-a0b8-d7f60fe544b7`,
        code: new lambda.AssetCode(codeLocation),
        handler: 'group_deployment_reset.handler',
        timeout: cdk.Duration.seconds(300),
        runtime: lambda.Runtime.PYTHON_3_7,
      })

    const provider = cfn.CustomResourceProvider.lambda(customHandler)

    new cfn.CustomResource(this, 'GroupRemovaHandler', {
      provider,
      resourceType: 'Custom::AutoDeleteGreengrassGroup'
      ,
      properties: {
        GroupId: this.attrId,
        GroupAn: this.attrArn
      }
    })
  }
}