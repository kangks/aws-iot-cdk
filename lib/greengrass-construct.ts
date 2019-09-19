import cdk = require('@aws-cdk/core');
import iot = require('@aws-cdk/aws-iot');
import lambda = require('@aws-cdk/aws-lambda');
import greengrass = require('@aws-cdk/aws-greengrass');
import sagemaker = require('@aws-cdk/aws-sagemaker');
import iam = require('@aws-cdk/aws-iam');
import { AutoDeleteGreengrassGroup } from './greengrassgroup-autodelete';
import { GreengrassDeploymentResetResource } from './greengrass-deployment-custom-resource';

interface GreengrassStackProps extends cdk.StackProps {
  greengrassLambdaAlias: lambda.Alias,
  thingName: string,
  certId: string,
  sageMakerJobArn: string
}

export default class GreengrassConstruct extends cdk.Construct {
  public readonly deploymentCommand: string;

  constructor(scope: cdk.Construct, id: string, props: GreengrassStackProps) {
    super(scope, id);

    const region: string = cdk.Stack.of(this).region;
    const accountId: string = cdk.Stack.of(this).account;
    const certArn: string = `arn:aws:iot:${region}:${accountId}:cert/${props.certId}`;

    const mlResourcePath: string = "/image-classification-ml";
    const mlResourceId: string = "mlResourceId";
    const logResourceId: string = "logResourceId";

    const iotThing = new iot.CfnThing(this, 'Thing', {
      thingName: props.thingName
    });

    if (iotThing.thingName !== undefined) {
      
      const thingArn = `arn:aws:iot:${region}:${accountId}:thing/${iotThing.thingName}`;

      const iotPolicy = new iot.CfnPolicy(this, 'Policy', {
        policyName: `${props.thingName}_policy`,
        policyDocument: {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Action": [
                "iot:*",
                "greengrass:*",
              ],
              "Resource": [
                "*"
              ]
            }
          ]
        }
      });
      iotPolicy.addDependsOn(iotThing);

      if (iotPolicy.policyName !== undefined) {
        const policyPrincipalAttachment = new iot.CfnPolicyPrincipalAttachment(this, 'PolicyPrincipalAttachment', {
          policyName: iotPolicy.policyName,
          principal: certArn
        })
        policyPrincipalAttachment.addDependsOn(iotPolicy)
      }

      const thingPrincipalAttachment = new iot.CfnThingPrincipalAttachment(this, 'ThingPrincipalAttachment', {
        thingName: iotThing.thingName,
        principal: certArn
      });
      thingPrincipalAttachment.addDependsOn(iotThing)

      const greengrassGroupRole = new iam.Role(this, 'greengrassGroupRole', {
        roleName: `${props.thingName}_group_policy`,
        assumedBy: new iam.ServicePrincipal('greengrass.amazonaws.com')});
      
      greengrassGroupRole.addToPolicy(
        new iam.PolicyStatement(
          {
            effect: iam.Effect.ALLOW,
            actions: [
              "iot:*",
              "greengrass:*",
            ],
            resources: [ '*' ]
          }          
        )
      );

      greengrassGroupRole.addToPolicy(
        new iam.PolicyStatement(
          {
            effect: iam.Effect.ALLOW,
            actions: [
              "sagemaker:*"
            ],
            resources: [ '*' ]
          }          
        )
      );

      // Greengrass Core
      const coreDefinition = new greengrass.CfnCoreDefinition(this, 'CoreDefinition', {
        name: `${props.thingName}_core`,
        initialVersion: {
          cores: [
            {
              certificateArn: certArn,
              id: '1',
              thingArn: thingArn
            }
          ]
        }
      });
      coreDefinition.addDependsOn(iotThing)

      const logsResource = <greengrass.CfnResourceDefinition.ResourceInstanceProperty>{
        id: logResourceId,
        name: 'log_file_resource',
        resourceDataContainer: {
            localVolumeResourceData: {
              sourcePath: '/tmp',
              destinationPath: '/log'
            }
        }
      };

      const mlResource = <greengrass.CfnResourceDefinition.ResourceInstanceProperty>{
        id: mlResourceId,
        name: 'ml_resource',
        resourceDataContainer: {
            sageMakerMachineLearningModelResourceData: {
              sageMakerJobArn: props.sageMakerJobArn,
              destinationPath: mlResourcePath
            }
        }
      };

      // Greengrass local resources - logs and ML
      const resourceDefinition = new greengrass.CfnResourceDefinition(this, 'ResourceDefinition', {
        name: `${props.thingName}_log_resource`,
        initialVersion: {
          resources: [
            logsResource,
            mlResource
          ]
        }
      });

      // Greengrass Lambda Function
      const functionDefinition = new greengrass.CfnFunctionDefinition(this, 'FunctionDefinition', {
        name: `${props.thingName}_function`,
        initialVersion: {
          functions: [
            {
              id: '1',
              functionArn: props.greengrassLambdaAlias.functionArn,
              functionConfiguration: {
                encodingType: 'binary',
                memorySize: 65536,
                pinned: true,
                timeout: 3,
                environment: {
                  resourceAccessPolicies: [
                    {
                      resourceId: logResourceId,
                      permission: 'rw'
                    }
                  ]
                }
              }
            }
          ]
        }
      });

      // Greengrass Connector
      const connectorDefinition = new greengrass.CfnConnectorDefinition(this, 'ConnectorDefinition', {
          name: `${props.thingName}_connector`,
          initialVersion: {
              connectors: [
              {
                  id: '1',
                  connectorArn: `arn:aws:greengrass:${region}::/connectors/ImageClassificationx86-64/versions/2`,
                  parameters: {
                      MLModelDestinationPath: mlResourcePath,
                      MLModelResourceId: mlResourceId,
                      MLModelSageMakerJobArn: props.sageMakerJobArn,
                      LocalInferenceServiceName: "image-classification",
                      LocalInferenceServiceTimeoutSeconds: 15,
                      LocalInferenceServiceMemoryLimitKB: 512000
                  }
              }
              ]
          }
          });
            
      // Greengrass Group
      // const group = new AutoDeleteGreengrassGroup(this, 'Group', {
      const group = new greengrass.CfnGroup(this,'Group',{
        name: `${props.thingName}_group`,
        roleArn: greengrassGroupRole.roleArn,
        initialVersion: {
          coreDefinitionVersionArn: coreDefinition.attrLatestVersionArn,
          resourceDefinitionVersionArn: resourceDefinition.attrLatestVersionArn,
          functionDefinitionVersionArn: functionDefinition.attrLatestVersionArn,
          connectorDefinitionVersionArn: connectorDefinition.attrLatestVersionArn
        }
      });

      const customResource = new GreengrassDeploymentResetResource(this, 'GreengrassDeploymentCustomResource', {
          groupId: group.attrId,
          groupArn: group.attrArn
      });

      group.addDependsOn(coreDefinition)
      group.addDependsOn(resourceDefinition)
      group.addDependsOn(functionDefinition)

      this.deploymentCommand = `aws --region ${region} greengrass create-deployment --group-id ${group.attrId} --deployment-type NewDeployment --group-version-id $(aws --region ${region} greengrass list-group-versions --group-id ${group.attrId} --query "sort_by(Versions, &CreationTimestamp)[-1].Version" --output text)`
    }
  }
}