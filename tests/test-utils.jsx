import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/lib/AuthContext';

const customRender = (ui, { route = '/', ...renderOptions } = {}) => {
  const Wrapper = ({ children }) => (
    <AuthProvider>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </AuthProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

export * from '@testing-library/react';
export { customRender as render };
