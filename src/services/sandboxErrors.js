// Use allowlisted service codes only; never render upstream diagnostics.
export function sandboxErrorMessage(error) {
  const code = error?.response?.data?.code ?? error?.code;
  if (code === 'SERVICE_LIMITS_UNAVAILABLE') return 'The test-bank setup needs an app update. Please contact the app team.';
  if (code === 'REQUEST_LIMITED' || (error?.response?.status ?? error?.status) === 429) {
    const retry = error?.response?.data?.retry_after ?? error?.data?.retry_after;
    if (Number.isFinite(retry) && retry > 60) {
      const unit = retry > 3600 ? 'hour' : 'minute';
      const amount = Math.ceil(retry / (retry > 3600 ? 3600 : 60));
      return `Connection limit reached. Try again in about ${amount} ${unit}${amount === 1 ? '' : 's'}.`;
    }
    return 'Too many connection attempts. Wait a minute, then try again.';
  }
  if (code === 'SANDBOX_NOT_CONFIGURED') return 'Test-bank connections are not configured yet. Please contact the app team.';
  if (code === 'SANDBOX_DATA_PENDING') return 'The test bank is still preparing transactions. Please try again shortly.';
  return 'The test bank could not connect. Please try again.';
}

const REFERENCES = new Set(['SERVICE_LIMITS_UNAVAILABLE','REQUEST_LIMITED','SANDBOX_NOT_CONFIGURED','SANDBOX_AUTH_FAILED','SANDBOX_TOKEN_FAILED','SANDBOX_EXCHANGE_FAILED','SANDBOX_IMPORT_FAILED','SANDBOX_SYNC_FAILED','SANDBOX_DATA_PENDING']);
export function sandboxErrorReference(error) {
  const code=error?.response?.data?.code ?? error?.code;
  return REFERENCES.has(code) ? ` Connection reference: ${code}.` : '';
}
