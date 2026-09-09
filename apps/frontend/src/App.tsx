import { BrowserRouter } from 'react-router';

import { AppRouter } from '@/router';

function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;
