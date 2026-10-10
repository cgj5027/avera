import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
const sdk=vi.hoisted(()=>({auth:{me:vi.fn(),logout:vi.fn()},app:{getPublicSettings:vi.fn()}}));
vi.mock('@/api/base44Client',()=>({base44:sdk}));
vi.mock('@/lib/app-params',()=>({appParams:{token:'fixture'}}));
import { AuthProvider, useAuth } from '../src/lib/AuthContext';
function Probe(){const auth=useAuth();return <><p>{auth.user?.id || 'Anonymous'}</p><button onClick={()=>auth.logout(false)}>Sign out</button></>;}
beforeEach(()=>{cleanup();vi.clearAllMocks();sdk.app.getPublicSettings.mockResolvedValue({id:'fixture',public_settings:{}});});
it('a late account verification cannot restore a logged-out session',async()=>{
 let resolve;sdk.auth.me.mockReturnValue(new Promise(r=>{resolve=r;}));
 render(<AuthProvider><Probe/></AuthProvider>);await waitFor(()=>expect(sdk.auth.me).toHaveBeenCalled());fireEvent.click(screen.getByText('Sign out'));
 await act(async()=>resolve({id:'a'}));await waitFor(()=>expect(sdk.auth.logout).toHaveBeenCalled());expect(screen.getByText('Anonymous')).toBeTruthy();expect(screen.queryByText('a')).toBeNull();
});
