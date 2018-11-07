# React Batch 'n Cache.

A library component for batching and catching asynchronous API queries.
Inspired by DataLoader and Apollo Client.

## Motivation

The aim of this library is to provide a simple-to-use state-managing component
that covers a good range of simple and common use cases for client-side data-
fetching, and to implement this in a declarative manner using React.

The primary inspiration for this component is the Query React component in the
[React Apollo library for Apollo Client][react-apollo]. The following example
component is given in the React Apollo documentation:

```jsx
const Feed = () => (
  <Query query={GET_DOGS}>
    {({ loading, error, data }) => {
      if (error) return <Error />;
      if (loading || !data) return <Fetching />;

      return <DogList dogs={data.dogs} />;
    }}
  </Query>
);
```

This declarative approach to data-fetching makes the Apollo Client library
very easy to use. This component only needs to specify the GraphQL query being
performed, and the API request is performed when the component is mounted. The
actual details of how to perform the API request is abstracted away to a
Provider component, which is rendered higher up the React tree, and connects
to the Query component via React Context.

The Query component uses the [render props pattern][render-props], which is a
great way to decouple state-managing components from DOM element-rendering UI
components. Here, the Query component is re-rendered when the data, loading,
or error states are updated, and the function-as-child is called with this new
data. This makes it easy to implement components to consume the data, and to
implement spinners or retry buttons on network failure. In addition, Apollo
Client internally caches component queries, preventing unnecessary requests
being made if a component is unmounted and remounted.

However, Apollo Client is first-and-foremost designed for use with a GraphQL
endpoint. While it is possible to use Apollo Client with [REST endpoints][rest-directive],
all client-side queries still need to be GraphQL, and so an
understanding of GraphQL schemas, types, and directives is needed. In many
cases, this can be overkill. GraphQL was designed as a way to visualise and
query vast networks of interconnected data, but not all data sources are this
complex. Sometimes, it's enough to just fetch a set of data of a single type
from a single endpoint.

Another source of inspiration for this library is the [DataLoader][dataloader]
library. This library provides an API to create _loaders_, which batch all calls
made to them in a single tick of the JavaScript event loop, and collate them
all into a single API request. Loaders also implement a simple memoisation cache to reduce unnecessary API calls.
This library was designed for use on the server-side, for consolidating
and removing repetition from GraphQL queries, reducing the load on different
backing services. This approach can be useful for reducing HTTP
requests made on the client-side, too. By collating distinct queries triggered when
different data-requiring components are rendered, and removing duplicate requests when
multiple components with the same data requirements are mounted, the number of
API requests can be dramatically reduced. (And yes, there is an [Apollo Client link that does this][batch-http].)

[react-apollo]: https://www.apollographql.com/docs/react/why-apollo.html#declarative-data
[rest-directive]: https://github.com/apollographql/apollo-link-rest
[render-props]: https://reactjs.org/docs/render-props.html
[dataloader]: https://github.com/facebook/dataloader
[batch-http]: https://www.apollographql.com/docs/link/links/batch-http.html

## Overview

This library provides a generating function `createLoader`, which generates a
Provider/Consumer pair, linked by React Context. The Provider accepts a
`fetch` function prop which behaves similarly to a batch-loading function from
DataLoader. When a set of Consumers are rendered below it in the tree, the
batch-loading function is triggered with the values requested by the consumers
in their props. The Provider automatically de-duplicates requests, avoids
requesting the same data multiple times, and batches requests made within a
short time period into a single HTTP request. The consumers re-render with the
respective data when the request is complete, or with the loading and error
states if the network request is in progress or has failed respectively.

### Example Usage

```jsx
import { createLoader, BnCStatus } from 'react-batch-n-cache';
const { BnCProvider, BnC } = createLoader();

// Using the Provider
const App = () => (
  <BnCProvider
    throttle={10}
    fetch={ids => fetchFromAPI(ids).then(res => res.data)}
  >
    <Main />
  </BnCProvider>
);

// Using the Consumer
const Main = () => (
  <BnC values={['a', 'b', 'c']}>
    {({ status, data, retry }) => {
      if (status === BnCStatus.LOADING) {
        return <span>Loading...</span>;
      }
      if (status === BnCStatus.ERROR) {
        return (
          <div className="error">
            Something went wrong.
            <button onClick={() => retry()}>Retry</button>
          </div>
        );
      }

      return (
        <ul>
          <li>{data.a}</li>
          <li>{data.b}</li>
          <li>{data.c}</li>
        </ul>
      );
    }}
  </BnC>
);
```

### API

TODO
