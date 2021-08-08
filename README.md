# APIGW Mock Integration with Cognito authorizer

## Deployment

1. `cd backend`
2. `npm run bootstrap`
3. `npm run deploy`
4. Populate the `frontend/index.tsx` with the output values
5. `cd frontend`
6. `npm start`

## Learnings

### Cognito

- The `autoVerifiedAttributes` really means **automatically start verification for these attributes**.
  This means that whenever user signs up, the "here is your code" email will be send to his email inbox.

  > Verification requires users to retrieve a code from their email or phone to confirm ownership. Verification of a phone or email is necessary to automatically confirm users and enable recovery from forgotten passwords. Learn more about email and phone verification.

  So to make sure the Cognito _will NOT_ send an email to the user with the verification code, you should set the `autoVerifiedAttributes` to an empty array.

- By default, the authorizer you can create (at least for the REST API) via cdk will honour the _IdToken_.
  This is because the _Authorizer_ does not have any scopes defined (most likely). There are few rules you have to follow to be able to use the _Access Token_.

  - You **have to specify the `openid` scope in addition to any other scopes for OAuth2.0, otherwise the authentication will not work and a, somewhat cryptic, Cognito error message will be thrown**.

  - For custom scopes you can create a _resource server_.

        The _resource server_ is an identifier you can associate an API with (not physically though, there is no resource relation between the API and the resource server) that handles authenticated requests.
        _Resource servers_ are used to provide granular scopes for different APIs

        > A resource server is a server for access-protected resources. It handles authenticated requests from an app that has an access token. Typically the resource server provides a CRUD API for making these access requests.

  - On the APIGW side of things you specify the scopes from the resource server on a given method.

  - **By default, if you use the Amplify SDK signIn your _AccessToken_ will not have all the scopes defined, only the `aws.cognito.signin.user.admin` will be present**. To have all the scopes you want on the _AccessToken_ you have to **use _OAuth_ sign in**. This involves creating a domain within Cognito.

- There is a difference between the _IdToken_ and the _AccessToken_

  - The **IdToken** is meant to be used by the application only (most likely the frontend of your application).
    You **should not use the _IdToken_ as a way of gaining access to an API**. The _IdToken_ contains info about the user, we would not want to unnecessarily expose that.

  - The **IdToken** contains list of **claims**. Claims are _assertions_ on a particular subject. Having a _email_ claim means that an assertion was made that the receiver of the _IdToken_ has a given email (the value is the value of the _email_ claim).

  - You **cannot revoke the IdToken**. You will have to wait for it to expire (the expiration TTL is 60 minutes)

  - The **AccessToken** is meant to be used for API **authorization**. It **does not contain any sensitive user info**, but instead contains _scopes_ and other attributes.

  - The **AccessToken** contains **scopes**. Scopes **define a resource that the user has access to**.

  - There is a problem with revoking _Access_ and _Id_ tokens. Sadly it's not supported by Cognito.

    > Amazon Cognito now supports token revocation and Amplify (from version 4.1.0) will revoke Amazon Cognito tokens if the application is online. This means Cognito refresh token cannot be used anymore to generate new Access and Id Tokens.
    > Access and Id Tokens are short-lived (60 minutes by default but can be set from 5 minutes to 1 day). After revocation these tokens cannot be used with Cognito User Pools anymore, however they are still valid when used with other services like AppSync or API Gateway.
    > For limiting subsequent calls to these other services after invalidating tokens, we recommend lowering token expiration time for your app client in the Cognito User Pools console. If you are using the Amplify CLI this can be accessed by running amplify console auth.

- The _domain_ from Cognito looks for reserved words. One of such is the _cognito_ word itself.

- A _Client is not enabled for OAuth2.0 flows_ error will be thrown if the callbacks urls defined within _Cognito_ are different than the ones defined within your client SDK.

- The _AuthorizationCodeGrant_ OAuth2.0 flow is the recommended one. You can have 2+ flows active at the same time.

### APIGW Mock Integration

- When creating a **mock integration** remember about the `responseParameters` both **within the `integrationResponses` and the `methodResponses` sections**. First you define what kind of _parameters_ you can use within the `methodResponses`, then you use them within the `integrationResponses`.

- The `$input.body` is empty for the _Mock Integration_. This means that you will not be able to **easily** return it from the integration.
  You could use `$context.requestOverride.path.body` to set the body in the `requestTemplate` section. This feels like a hack but it works.

- The `$util` that is exposed to you in the context of mapping templates is very limited. It's no where near that rich in terms of functionality as the
  `$util` you can use while working with _AppSync_.

- Related to the previous post, I'm pretty upset that there is no way to auto-generate an ID or a timestamp in a given format.
  Thankfully, the ID you return could be the APIGW `requestId` and the timestamp could be the `requestTimeEpoch` from APIGW `$context`.
