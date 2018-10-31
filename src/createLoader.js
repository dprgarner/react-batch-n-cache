import React from 'react';

import wrapProvider from './wrapProvider';
import wrapConsumer from './wrapConsumer';

export default function createLoader() {
  const { Provider, Consumer } = React.createContext();
  const BnCProvider = wrapProvider(Provider);
  const BnC = wrapConsumer(Consumer);
  return { BnCProvider, BnC };
}
