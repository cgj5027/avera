// Use allowlisted service codes only; never render upstream diagnostics.
export function sandboxErrorMessage(error) {
  const code = error?.response?.data?.code ?? error?.code;
  if (code === 'SERVICE_LIMITS_UNAVAILABLE') return 'The test-bank setup needs an app update. Please contact the app team.';
  if (code === 'REQUEST_LIMITED' || (error?.response?.status ?? error?.status) === 429) return 'Too many connection attempts. Wait a minute, then try again.';
  if (code === 'SANDBOX_NOT_CONFIGURED') return 'Test-bank connections are not configured yet. Please contact the app team.';
  if (code === 'SANDBOX_DATA_PENDING') return 'The test bank is still preparing transactions. Please try again shortly.';
  return 'The test bank could not connect. Please try again.';
}
