import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { AccountsPage } from './routes/AccountsPage';
import { CategoriesPage } from './routes/CategoriesPage';
import { DashboardPage } from './routes/DashboardPage';
import { ImportExportPage } from './routes/ImportExportPage';
import { TransactionsPage } from './routes/TransactionsPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/import-export" element={<ImportExportPage />} />
      </Route>
    </Routes>
  );
}
