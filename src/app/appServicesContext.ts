import { createContext, useContext } from 'react';
import type { AppServices } from './appServices';

export const AppServicesContext = createContext<AppServices | null>(null);

export function useAppServices(): AppServices {
  const services = useContext(AppServicesContext);
  if (!services) {
    throw new Error('App services are not available.');
  }

  return services;
}
