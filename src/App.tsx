import { useAuthStore } from './store/useAuthStore';
import { LoginPage } from './pages/LoginPage';
import { MainLayout } from './components/MainLayout';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <div className="h-full w-full">
      {!isAuthenticated ? (
        <LoginPage />
      ) : (
        <MainLayout />
      )}
    </div>
  );
}

export default App;
