import React from 'react';

import wrapProvider from './wrapProvider';
import wrapConsumer from './wrapConsumer';

export default function createLoader() {
  const { Provider, Consumer } = React.createContext();
  const BnCProvider = wrapProvider(Provider);
  const BnCConsumer = wrapConsumer(Consumer);
  return { BnCProvider, BnCConsumer };
}
