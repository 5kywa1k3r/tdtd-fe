// src/App.tsx
import { useRoutes } from 'react-router-dom';
import { appRoutes } from './routes/appRoutes';

function App() {
  const element = useRoutes(appRoutes);
  return element;
}

export default App;
