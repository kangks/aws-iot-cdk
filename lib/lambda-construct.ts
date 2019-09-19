import cdk = require('@aws-cdk/core');
import {Function,Alias,Runtime,Code} from '@aws-cdk/aws-lambda';
import * as path from 'path';

export default class LambdaConstruct extends cdk.Construct {

    public readonly lambdaAlias: Alias;

    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id);

        // Greengrass Lambda function
        const lambda = new Function(this, 'GreengrassMLIHandler', {
            runtime: Runtime.PYTHON_3_7,
            code: Code.fromAsset(
                path.join(__dirname, '..', 'lambda_functions', 'greengrass_connector'),
            ),
            handler: 'handler.handler',
        });
        const version = lambda.addVersion('GreengrassMLIVersion');

        // Greengrass Lambda Alias
        this.lambdaAlias = new Alias(this, 'GreengrassMLIAlias', {
            aliasName: 'mli',
            version: version
        })
    }
}