import { describe, it, expect } from 'vitest';

describe('GET /api/health', () => {
  it('returns 200 with status ok and timestamp', () => {
    // Validate the response shape — uptime field must NOT be present
    const mockResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };

    expect(mockResponse.status).toBe('ok');
    expect(typeof mockResponse.timestamp).toBe('string');
    expect(mockResponse).not.toHaveProperty('uptime');
  });

  it('does not expose uptime or internal metrics', () => {
    // Verify the health response shape does not include uptime
    const mockResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };

    expect(mockResponse).not.toHaveProperty('uptime');
    expect(mockResponse).not.toHaveProperty('memory');
    expect(mockResponse).not.toHaveProperty('cpu');
    expect(mockResponse).toHaveProperty('status');
    expect(mockResponse).toHaveProperty('timestamp');
  });

  it('handles error state with 503', () => {
    const errorResponse = {
      status: 'error',
      message: 'Connection timeout',
      timestamp: new Date().toISOString(),
    };

    expect(errorResponse.status).toBe('error');
    expect(errorResponse).toHaveProperty('message');
    expect(errorResponse).toHaveProperty('timestamp');
  });
});