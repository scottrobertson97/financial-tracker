import { ReactNode, useEffect, useState } from 'react';
import { createAppServices, type AppServices } from './appServices';
import { AppServicesContext } from './appServicesContext';

interface AppServicesProviderProps {
  children: ReactNode;
}

export function AppServicesProvider({ children }: AppServicesProviderProps) {
  const [services, setServices] = useState<AppServices | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    createAppServices()
      .then((createdServices) => {
        if (isMounted) {
          setServices(createdServices);
        }
      })
      .catch((unknownError) => {
        if (isMounted) {
          setError(unknownError instanceof Error ? unknownError.message : 'Unable to initialize local database.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-ledger-paper px-4 text-ledger-ink">
        <div className="max-w-lg rounded-md border border-ledger-line bg-ledger-panel p-5">
          <h1 className="text-lg font-semibold">Database unavailable</h1>
          <p className="mt-2 text-sm text-ledger-muted">{error}</p>
        </div>
      </div>
    );
  }

  if (!services) {
    return (
      <div className="grid min-h-screen place-items-center bg-ledger-paper px-4 text-sm text-ledger-muted">
        Opening local ledger...
      </div>
    );
  }

  return <AppServicesContext.Provider value={services}>{children}</AppServicesContext.Provider>;
}
