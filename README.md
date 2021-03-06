# React Batch 'n Cache.

A library component for batching and catching asynchronous API queries.
Inspired by DataLoader and Apollo Client.

[![npm version](https://badge.fury.io/js/react-batch-n-cache.svg)](https://badge.fury.io/js/react-batch-n-cache)
[![Build Status](https://travis-ci.org/dprgarner/react-batch-n-cache.svg?branch=master)](https://travis-ci.org/dprgarner/react-batch-n-cache)

## Overview

This library exports a generating function `createLoader`, which generates a
Provider Component, a Consumer Component, and an equivalent Hook,
linked to the provider by React Context. The Provider accepts a
`fetch` prop which takes an asynchronous function loading a batch of data from a
set of values.
When a set of Consumers components or components using the Hook are
rendered below the provider in the tree, the
batch-loading function is triggered with the values requested by the consumers.
The Provider automatically de-duplicates requests, avoids
requesting the same data multiple times, and batches requests made within a
short time period into a single HTTP request. The consumers re-render with the
respective data when the request is complete, with the loading state if the
network request is in progress, and with the error state if the network
request has failed.

### Example Usage

```jsx
import { createLoader, BnCStatus } from 'react-batch-n-cache';
const { BnCProvider, BnC, useBnC } = createLoader();

// Using the Provider
const App = () => (
  <BnCProvider
    throttle={10}
    fetch={ids => fetchFromAPI(ids).then(res => res.data)}
    retry={{ delay: 'exponential', max: 5 }}
  >
    <Consumer />
    <ConsumerWithHook />
  </BnCProvider>
);

// Using the Consumer Component
const Consumer = () => (
  <BnC values={['item-a-id', 'item-b-id', 'item-c-id']}>
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
      const [itemA, itemB, itemC] = data;

      return (
        <ul>
          <li>{itemA}</li>
          <li>{itemB}</li>
          <li>{itemC}</li>
        </ul>
      );
    }}
  </BnC>
);

// Using the Hook
const ConsumerWithHook = () => {
  const { status, data, retry } = useBnC([
    'item-a-id',
    'item-b-id',
    'item-c-id',
  ]);
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
  const [itemA, itemB, itemC] = data;

  return (
    <ul>
      <li>{itemA}</li>
      <li>{itemB}</li>
      <li>{itemC}</li>
    </ul>
  );
};
```

## Motivation

The aim of this library is to provide a simple-to-use state-managing component
that covers a good range of simple and common use cases for client-side data-fetching,
and to implement this in a declarative manner using React.

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
library. This library allows you to create _loaders_, which are functions
which collate all calls made to them within a single tick of the JavaScript
event loop, and make a single batch call to another function. In the context
of remote requests, these can be used to collate multiple independent calls
into a single request. Loaders also implement a simple memoisation cache to
reduce unnecessary remote requests. This library was designed for use on the server-
side, for consolidating and removing repetition from GraphQL queries, reducing
the load on different backing services.

This approach can be useful for reducing HTTP
requests made on the client-side, too. By collating distinct queries triggered when
different data-requiring components are rendered, and removing duplicate requests when
multiple components with the same data requirements are mounted, the number of
API requests can be dramatically reduced. (And yes, there is an [Apollo Client link that does this][batch-http].)

[react-apollo]: https://www.apollographql.com/docs/react/why-apollo.html#declarative-data
[rest-directive]: https://github.com/apollographql/apollo-link-rest
[render-props]: https://reactjs.org/docs/render-props.html
[dataloader]: https://github.com/facebook/dataloader
[batch-http]: https://www.apollographql.com/docs/link/links/batch-http.html

### API

#### `createLoader`

A function that generates a React Batch 'n Cache Provider component class,
`BnCProvider`, a Consumer component class `BnC`, and a Hook `useBnC`.

```jsx
import { createLoader } from 'react-batch-n-cache';
const { BnCProvider, BnC, useBnC } = createLoader();
```

#### `<BnCProvider>`

A component that controls the remote data requesting, consolidating, and
caching.

##### Props

- `fetch: Array<String> => Promise<Array<Any>>`: When at least one `BnC` component
  is rendered below this component in the render tree, the `fetch` prop will be
  called with an array of the IDs given as props to the Consumer components. The
  function given to the `fetch` prop should generate a promise which resolves to
  an array containing the remotely-fetched data in the same order as the IDs in
  the argument.
- `throttle: Number?`: The time in milliseconds to wait between `BnC` components
  being rendered in the tree before triggering a `fetch` request. Defaults to 0.
- `retry: { delay?: <number> | 'exponential', max?: <number> }`: this prop
  specifies how to attempt to retry the `fetch` callback if the promise is
  rejected. The value of `retry.delay` can be a number of milliseconds to wait
  between requests, or `'exponential'` to make the delay time double after
  each request attempt. The request will be re-attempted up to `retry.max`
  times. Retries can also be triggered manually in the `retry` prop of the `BnC`
  consumer component. Defaults to `{ delay: 'exponential', max: 25 }`.

#### `<BnC>`

A component that declares the IDs of the remote data it requires, and uses
this via a render prop with loading and error states.

##### Props

- `ids: Array<String>`: An array of string values representing the IDs of the
  data that the component needs to request from the remote data source before
  rendering. These will be called as the argument to the `fetch` prop of the
  `BnCProvider` above the component in the tree, along with any other `values`
  from other `BnC` components mounted at a similar time.
- `children: { data, status, retry } => React.Node`: A render prop for determining
  how to render the fetched data. The render prop is called with a single
  argument with the following keys:
  - `data: <Array<Any>>`: an array where the entries are the fetched values of the
    data, in the same order as the `values` prop. Entries corresponding to data
    that has not yet loaded or failed to load will be `undefined`. The data will
    be available if it was fetched and cached by another `BnC` component mount.
  - `status: BnCStatus.LOADING | BnCStatus.ERROR | BnCStatus.COMPLETE`: reports
    the status of any request to fetch the data in `values`. This can be used to generate
    loading and error states of the component.
  - `retry: () => void`: A function to manually trigger another request of
    missing data. Retries will also be called by the configuration set in the `retry`
    prop for `BnCProvider`.

#### `useBnC`

A React Hook version of the consumer component, with signature

```js
(values: Array<String>) => ({ data: <Array<Any>>, status: <BnCStatus>, retry: () => void })

```

The return value of the Hook has the same form as the render prop arguments of the Consumer component.

#### `BnCStatus`

```js
import { BnCStatus } from 'react-batch-n-cache';
```

An object with the keys `LOADING`, `COMPLETE`, and `ERRORED`. The `status` key
in the argument of the `BnC` component's render prop and in the return value
of the `useBnC` Hook will always be called with one of these values.

### Releasing

Releases to NPM are performed via Travis when tagged commits are pushed to the
repo. Create a new tagged commit and bump the version in package.json with:

```bash
npm version patch
```

and push the new commits and tags with:

```bash
git push && git push --tags
```
