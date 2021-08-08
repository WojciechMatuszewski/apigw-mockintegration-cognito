import { withAuthenticator } from "@aws-amplify/ui-react";
import {
  ChakraProvider,
  ColorModeScript,
  Container,
  theme
} from "@chakra-ui/react";
import Amplify, { API, Auth } from "aws-amplify";
import * as React from "react";
import ReactDOM from "react-dom";
import { App } from "./App";
import { Header } from "./Header";

// Populate these with values from the backend deployment outputs.
Amplify.configure({
  aws_user_pools_id: "x",
  aws_user_pools_web_client_id: "x",
  aws_cognito_identity_pool_id: "x",
  aws_cognito_region: "x"
});

Auth.configure({
  oauth: {
    domain: "xxx.auth.us-east-1.amazoncognito.com",
    scope: [
      "testResourceServer/test",
      "openid",

      // Without this scope, cognito will throw 'AccessToken does not have required scopes'.
      "aws.cognito.signin.user.admin"
    ],
    redirectSignIn: "http://localhost:3000",
    redirectSignOut: "http://localhost:3000",
    responseType: "code"
  }
});

API.configure({
  endpoints: [
    {
      name: "root",
      endpoint: "https://iplog1rs89.execute-api.us-east-1.amazonaws.com/prod",
      custom_header: async () => {
        const accessToken = (await Auth.currentSession()).getAccessToken();
        return {
          Authorization: accessToken.getJwtToken(),
          // The client AWS uses here does not specify this by default for post request without body.
          // If this is not specified, the APIGW (the service itself) will throw 415 (unsupported media type error).
          // This error will result in 500 statusCode
          "Content-Type": "application/json"
        };
      }
    }
  ]
});

const AuthenticatedApp = withAuthenticator(
  () => {
    return (
      <React.Fragment>
        <Header />
        <App />
      </React.Fragment>
    );
  },
  { federated: { oauthConfig: {} } }
);

ReactDOM.render(
  <React.StrictMode>
    <ColorModeScript />
    <ChakraProvider theme={theme}>
      <Container>
        <AuthenticatedApp />
      </Container>
    </ChakraProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
