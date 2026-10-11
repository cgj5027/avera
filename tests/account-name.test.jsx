import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
const sdk = vi.hoisted(() => ({ auth: { me: vi.fn(), updateMe: vi.fn(), logout: vi.fn() }, app: { getPublicSettings: vi.fn() } }));
vi.mock('@/api/base44Client', () => ({ base44: sdk }));
vi.mock('@/lib/app-params', () => ({ appParams: { token: 'fixture' } }));
import { AuthProvider, useAuth } from '../src/lib/AuthContext';
import AccountNameForm from '../src/components/settings/AccountNameForm';
function Account() {
  const { user, logout } = useAuth();
  return <>{user ? <AccountNameForm key={user.id}/> : <p>Signed out</p>}<button onClick={() => logout(false)}>Sign out</button></>;
}
beforeEach(() => {
  vi.resetAllMocks();
  sdk.app.getPublicSettings.mockResolvedValue({id:'fixture',public_settings:{}});
  sdk.auth.me.mockResolvedValue({id:'a',full_name:'Original name',email:'fixture@example.test'});
});
it('saves a trimmed name using only the editable profile field and updates the visible account', async () => {
  sdk.auth.updateMe.mockResolvedValue({id:'a',full_name:'Original name',display_name:'New name'});
  render(<AuthProvider><Account/></AuthProvider>);
  const input=await screen.findByLabelText('Name');expect(input.value).toBe('Original name');
  fireEvent.change(input,{target:{value:'  New name  '}});fireEvent.click(screen.getByRole('button',{name:'Save name'}));
  expect((await screen.findByRole('status')).textContent).toBe('Name updated.');
  expect(sdk.auth.updateMe).toHaveBeenCalledExactlyOnceWith({display_name:'New name'});
  expect(input.value).toBe('New name');expect(screen.getByRole('button',{name:'Save name'}).disabled).toBe(true);
});
it('retains the draft and permits retry after a save failure', async () => {
  sdk.auth.updateMe.mockRejectedValue(new Error('private diagnostic'));
  render(<AuthProvider><Account/></AuthProvider>);const input=await screen.findByLabelText('Name');
  fireEvent.change(input,{target:{value:'New name'}});fireEvent.click(screen.getByRole('button',{name:'Save name'}));
  expect((await screen.findByRole('alert')).textContent).not.toContain('private');expect(input.value).toBe('New name');
  sdk.auth.updateMe.mockResolvedValue({id:'a',display_name:'New name'});fireEvent.click(screen.getByRole('button',{name:'Save name'}));
  expect(await screen.findByRole('status')).toBeTruthy();
});
it('rejects whitespace-only names without an API request', async () => {
  render(<AuthProvider><Account/></AuthProvider>);const input=await screen.findByLabelText('Name');
  fireEvent.change(input,{target:{value:'   '}});fireEvent.click(screen.getByRole('button',{name:'Save name'}));
  expect(await screen.findByRole('alert')).toBeTruthy();expect(sdk.auth.updateMe).not.toHaveBeenCalled();
});
it('a late name update cannot restore a logged-out account', async () => {
  let complete;sdk.auth.updateMe.mockReturnValue(new Promise(resolve=>{complete=resolve;}));
  render(<AuthProvider><Account/></AuthProvider>);const input=await screen.findByLabelText('Name');
  fireEvent.change(input,{target:{value:'New name'}});fireEvent.click(screen.getByRole('button',{name:'Save name'}));
  await waitFor(()=>expect(sdk.auth.updateMe).toHaveBeenCalled());fireEvent.click(screen.getByRole('button',{name:'Sign out'}));
  await act(async()=>complete({id:'a',display_name:'New name'}));
  expect(screen.getByText('Signed out')).toBeTruthy();expect(screen.queryByLabelText('Name')).toBeNull();
});
