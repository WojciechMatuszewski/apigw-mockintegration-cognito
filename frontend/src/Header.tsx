import React from "react";
import { AmplifySignOut } from "@aws-amplify/ui-react";
import { Auth } from "aws-amplify";
import { Box } from "@chakra-ui/react";
import { Async } from "react-async";

const getUserId = async () => {
  const user = await Auth.currentAuthenticatedUser();
  return user.username;
};

export const Header = () => {
  return (
    <Box>
      <AmplifySignOut />
      <Async promiseFn={getUserId}>
        <Async.Rejected>
          {error => <Async promiseFn={getUserId}>{error.name}</Async>}
        </Async.Rejected>
        <Async.Resolved>{(userId: string) => <p>{userId}</p>}</Async.Resolved>
      </Async>
    </Box>
  );
};
