import React from 'react';

import wrapProvider from './wrapProvider';
import wrapConsumer from './wrapConsumer';

export default function createLoader() {
  const BnCContext = React.createContext();
  const BnCProvider = wrapProvider(BnCContext.Provider);
  const BnC = wrapConsumer(BnCContext);
  return { BnCProvider, BnC };
}
