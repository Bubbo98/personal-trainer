import { ApiError, CLIENT_TOKEN_KEY, clientApi, fileNameFromDisposition, publicApi } from './api';
import { errorResponse, mockApi } from '../test/render';

describe('api client', () => {
  it('returns the data of a success answer and sends the session token', async () => {
    localStorage.setItem(CLIENT_TOKEN_KEY, 'abc');
    const { fetchMock } = mockApi({ 'GET /workout/plan': { exercises: [1, 2] } });

    await expect(clientApi.get('/workout/plan')).resolves.toEqual({ exercises: [1, 2] });
    const headers = fetchMock.mock.calls[0][1]!.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer abc');
  });

  it('sends JSON bodies', async () => {
    const { calls, fetchMock } = mockApi({ 'POST /workout/logs': null });
    await clientApi.post('/workout/logs', { exerciseId: 3 });
    expect(calls[0].body).toEqual({ exerciseId: 3 });
    expect((fetchMock.mock.calls[0][1]!.headers as Headers).get('Content-Type')).toBe('application/json');
  });

  it('leaves multipart bodies to the browser', async () => {
    const { fetchMock } = mockApi({ 'POST /upload': null });
    const form = new FormData();
    form.append('pdf', new Blob(['x']), 'a.pdf');
    await clientApi.post('/upload', form);
    const init = fetchMock.mock.calls[0][1]!;
    expect(init.body).toBe(form);
    expect((init.headers as Headers).has('Content-Type')).toBe(false);
  });

  it('does not send a token without a session', async () => {
    const { fetchMock } = mockApi({ 'GET /reviews/featured': [] });
    localStorage.setItem(CLIENT_TOKEN_KEY, 'abc');
    await publicApi.get('/reviews/featured');
    expect((fetchMock.mock.calls[0][1]!.headers as Headers).has('Authorization')).toBe(false);
  });

  it('turns error answers into ApiError with status and code', async () => {
    mockApi({ 'GET /auth/verify': () => errorResponse(403, 'Scheda scaduta', 'PLAN_EXPIRED') });
    const error = await clientApi.get('/auth/verify').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 403, code: 'PLAN_EXPIRED', message: 'Scheda scaduta' });
  });

  it('copes with non-JSON error pages', async () => {
    mockApi({ 'GET /x': () => new Response('<html>Bad gateway</html>', { status: 502 }) });
    await expect(clientApi.get('/x')).rejects.toMatchObject({ status: 502, message: 'HTTP 502' });
  });

  it('reports network failures as NETWORK errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(clientApi.get('/x')).rejects.toMatchObject({ status: 0, code: 'NETWORK' });
  });

  it('downloads files with the server-provided name', async () => {
    mockApi({
      'GET /pdf/download': () =>
        new Response('%PDF', {
          headers: { 'Content-Disposition': `attachment; filename="scheda_.pdf"; filename*=UTF-8''scheda%20%C3%A8.pdf` },
        }),
    });
    const file = await clientApi.download('/pdf/download');
    expect(file.fileName).toBe('scheda è.pdf');
    expect(await file.blob.text()).toBe('%PDF');
  });

  it('manages the session token', () => {
    expect(clientApi.hasToken()).toBe(false);
    clientApi.setToken('t1');
    expect(localStorage.getItem(CLIENT_TOKEN_KEY)).toBe('t1');
    expect(clientApi.hasToken()).toBe(true);
    clientApi.clearToken();
    expect(clientApi.hasToken()).toBe(false);
  });
});

describe('fileNameFromDisposition', () => {
  it.each([
    [null, null],
    ['inline', null],
    ['attachment; filename="plan.pdf"', 'plan.pdf'],
    ['attachment; filename=plan.pdf', 'plan.pdf'],
    [`attachment; filename*=UTF-8''%E2%82%AC.pdf`, '€.pdf'],
    [`attachment; filename="fallback.pdf"; filename*=UTF-8''%E0%A4%A.pdf`, 'fallback.pdf'],
  ])('%s → %s', (header, expected) => {
    expect(fileNameFromDisposition(header)).toBe(expected);
  });
});
