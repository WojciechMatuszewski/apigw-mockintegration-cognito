import { Alert } from "@chakra-ui/alert";
import { API } from "aws-amplify";
import * as React from "react";
import { Async } from "react-async";

const callAPI = async () => {
  return API.post("root", `/`, {
    body: { name: "A dog", type: "dog" }
  });
};

export const App = () => {
  return (
    <React.Fragment>
      <Async promiseFn={callAPI}>
        <Async.Loading>{() => <p>loading...</p>}</Async.Loading>
        <Async.Rejected>
          {error => <Alert status="error">{JSON.stringify(error)}</Alert>}
        </Async.Rejected>
        <Async.Fulfilled>
          {data => {
            return <code>{JSON.stringify(data, null, 2)}</code>;
          }}
        </Async.Fulfilled>
      </Async>
    </React.Fragment>
  );
};
