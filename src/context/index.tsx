import React from 'react';
import { AppProvider } from './AppContext';
import { OrderProvider } from './OrderContext';
import { MenuProvider } from './MenuContext';
import { NotificationProvider } from './NotificationContext';

interface AllProvidersProps {
  children: React.ReactNode;
}

export function AllProviders({ children }: AllProvidersProps) {
  return (
    <NotificationProvider>
      <AppProvider>
        <MenuProvider>
          <OrderProvider>
            {children}
          </OrderProvider>
        </MenuProvider>
      </AppProvider>
    </NotificationProvider>
  );
}
