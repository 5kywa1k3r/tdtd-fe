// src/App.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { appRoutes } from './routes/appRoutes';

const router = createBrowserRouter(appRoutes);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
