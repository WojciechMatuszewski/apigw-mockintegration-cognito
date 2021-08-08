import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { join } from "path";

export class APIGWMockIntegrationCognitoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const preSignUpHandler = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "preSignUpHandler",
      {
        handler: "handler",
        entry: join(__dirname, "../functions/autoVerifyUser.ts")
      }
    );
    const userPool = new cdk.aws_cognito.UserPool(this, "userPool", {
      // Make sure the Cognito is not sending the verification email to the user.
      // The `preSignUp` handler takes care of verifying a given user.
      autoVerify: {
        email: false
      },
      passwordPolicy: {
        minLength: 6,
        requireDigits: false,
        requireLowercase: false,
        requireSymbols: false,
        requireUppercase: false
      },
      signInAliases: {
        email: true
      },
      signInCaseSensitive: false,
      selfSignUpEnabled: true,
      lambdaTriggers: {
        preSignUp: preSignUpHandler
      }
    });

    const resourceServerScope = new cdk.aws_cognito.ResourceServerScope({
      scopeName: "test",
      scopeDescription: "testing123"
    });
    const userPoolResourceServer = new cdk.aws_cognito.UserPoolResourceServer(
      this,
      "resourceServer",
      {
        identifier: "testResourceServer",
        userPool,
        scopes: [resourceServerScope]
      }
    );

    const userPoolClient = new cdk.aws_cognito.UserPoolClient(
      this,
      "userPoolClient",
      {
        userPool,
        authFlows: {
          adminUserPassword: false,
          userPassword: true,
          userSrp: true
        },
        generateSecret: false,
        supportedIdentityProviders: [
          cdk.aws_cognito.UserPoolClientIdentityProvider.COGNITO
        ],
        preventUserExistenceErrors: true,
        oAuth: {
          scopes: [
            cdk.aws_cognito.OAuthScope.PHONE,
            cdk.aws_cognito.OAuthScope.EMAIL,
            cdk.aws_cognito.OAuthScope.OPENID,
            cdk.aws_cognito.OAuthScope.PROFILE,
            cdk.aws_cognito.OAuthScope.COGNITO_ADMIN,
            cdk.aws_cognito.OAuthScope.resourceServer(
              userPoolResourceServer,
              resourceServerScope
            )
          ],
          callbackUrls: ["http://localhost:3000"],
          logoutUrls: ["http://localhost:3000"],
          flows: {
            // Exposes the `code`
            implicitCodeGrant: true,
            // Recommended one
            authorizationCodeGrant: true
          }
        }
      }
    );

    const userPoolClientDomain = new cdk.aws_cognito.UserPoolDomain(
      this,
      "userPoolClientDomain",
      {
        userPool,
        cognitoDomain: { domainPrefix: "wojteklearningstuff" }
      }
    );

    const identityPool = new cdk.aws_cognito.CfnIdentityPool(
      this,
      "identityPool",
      {
        allowUnauthenticatedIdentities: true,
        cognitoIdentityProviders: [
          {
            clientId: userPoolClient.userPoolClientId,
            providerName: userPool.userPoolProviderName
          }
        ]
      }
    );

    const authenticatedRole = new cdk.aws_iam.Role(
      this,
      "cognitoAuthenticatedRole",
      {
        assumedBy: new cdk.aws_iam.FederatedPrincipal(
          "cognito-identity.amazonaws.com",
          {
            StringEquals: {
              "cognito-identity.amazonaws.com:aud": identityPool.ref
            },
            "ForAnyValue:StringLike": {
              "cognito-identity.amazonaws.com:amr": "authenticated"
            }
          },
          "sts:AssumeRoleWithWebIdentity"
        )
      }
    );
    const unauthenticatedRole = new cdk.aws_iam.Role(
      this,
      "cognitoUnauthenticatedRole",
      {
        assumedBy: new cdk.aws_iam.FederatedPrincipal(
          "cognito-identity.amazonaws.com",
          {
            StringEquals: {
              "cognito-identity.amazonaws.com:aud": identityPool.ref
            },
            "ForAnyValue:StringLike": {
              "cognito-identity.amazonaws.com:amr": "unauthenticated"
            }
          },
          "sts:AssumeRoleWithWebIdentity"
        )
      }
    );

    const identityPoolRoleAttachment =
      new cdk.aws_cognito.CfnIdentityPoolRoleAttachment(
        this,
        "roleAttachment",
        {
          identityPoolId: identityPool.ref,
          roles: {
            authenticated: authenticatedRole.roleArn,
            unauthenticated: unauthenticatedRole.roleArn
          }
        }
      );

    const cognitoAuthorizer = new cdk.aws_apigateway.CognitoUserPoolsAuthorizer(
      this,
      "cognitoAuthorizer",
      {
        cognitoUserPools: [userPool]
      }
    );

    const mockAPI = new cdk.aws_apigateway.RestApi(this, "mockAPI", {
      defaultCorsPreflightOptions: {
        allowOrigins: cdk.aws_apigateway.Cors.ALL_ORIGINS,
        allowMethods: cdk.aws_apigateway.Cors.ALL_METHODS
      }
    });

    /**
     * APIGW fails to process incoming request, then this will kick in.
     */
    mockAPI.addGatewayResponse("403Response", {
      type: cdk.aws_apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        "Access-Control-Allow-Methods":
          "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
        "Access-Control-Allow-Headers":
          "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
        "Access-Control-Allow-Origin": "'*'"
      }
    });

    /**
     * APIGW fails to process incoming request, then this will kick in.
     */
    mockAPI.addGatewayResponse("5xxResponse", {
      type: cdk.aws_apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        "Access-Control-Allow-Methods":
          "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
        "Access-Control-Allow-Headers":
          "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
        "Access-Control-Allow-Origin": "'*'"
      }
    });

    const mockPetsAPI = new cdk.aws_apigateway.RestApi(this, "mockPetsAPI", {
      defaultCorsPreflightOptions: {
        allowOrigins: cdk.aws_apigateway.Cors.ALL_ORIGINS,
        allowMethods: cdk.aws_apigateway.Cors.ALL_METHODS
      }
    });

    mockPetsAPI.root.addMethod(
      "POST",
      new cdk.aws_apigateway.MockIntegration({
        passthroughBehavior: cdk.aws_apigateway.PassthroughBehavior.NEVER,
        requestTemplates: {
          // For this particular request (in our case every request that is made to this endpoint)
          // respond with integration response defined for statusCode 201.
          "application/json": `
             #set($context.requestOverride.path.body = $input.body)
            {
              "statusCode": 201
            }`
        },
        integrationResponses: [
          {
            statusCode: "201",
            responseTemplates: {
              "application/json": `
                #set($body = $context.requestOverride.path.body)
                #set($parsedBody = $util.parseJson($body))
              {
                  "id": "$context.requestId",
                  "name": "$parsedBody.name",
                  "type": "$parsedBody.type",
                  "createdAt": $context.requestTimeEpoch,
                  "updatedAt": $context.requestTimeEpoch
                }`
            },
            // These definitions would not be possible without the definition within the `responseParameters` section.
            responseParameters: {
              "method.response.header.Access-Control-Allow-Methods":
                "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
              "method.response.header.Access-Control-Allow-Headers":
                "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
              "method.response.header.Access-Control-Allow-Origin": "'*'"
            }
          }
        ]
      }),
      {
        authorizer: cognitoAuthorizer,
        authorizationScopes: [
          `${userPoolResourceServer.userPoolResourceServerId}/${resourceServerScope.scopeName}`
        ],
        methodResponses: [
          {
            // Everything defined in this section is applicable to the integration response with `statusCode` of 201.
            statusCode: "201",
            responseParameters: {
              // What kind of response parameters are allowed to be defined within the `responseParameters` section.
              "method.response.header.Access-Control-Allow-Origin": true,
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Headers": true
            }
          }
        ]
      }
    );

    new cdk.CfnOutput(this, "userPoolId", { value: userPool.userPoolId });

    new cdk.CfnOutput(this, "userPoolClientId", {
      value: userPoolClient.userPoolClientId
    });

    new cdk.CfnOutput(this, "identityPoolId", {
      value: identityPool.ref
    });

    new cdk.CfnOutput(this, "userPoolDomain", {
      value: userPoolClientDomain.domainName
    });

    new cdk.CfnOutput(this, "region", {
      value: cdk.Aws.REGION
    });
  }
}
