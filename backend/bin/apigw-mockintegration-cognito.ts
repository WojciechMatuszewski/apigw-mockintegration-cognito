#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { APIGWMockIntegrationCognitoStack } from "../lib/apigw-mockintegration-cognito-stack";

const app = new cdk.App();
new APIGWMockIntegrationCognitoStack(app, "APIGWAuthorizerStack", {
  env: { region: "us-east-1" }
});
