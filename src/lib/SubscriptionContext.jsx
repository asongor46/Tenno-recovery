import React from "react";

export const SubscriptionContext = React.createContext({ isReadOnly: false });

export function useSubscription() {
  return React.useContext(SubscriptionContext);
}