import { apiClient } from '@/app/api';

import {
  approveQuote,
  createQuote,
  createRequest,
  getQuotes,
  getRequests,
  rejectQuote,
} from './api';

vi.mock('@/app/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const apiClientMock = vi.mocked(apiClient, { deep: true });

describe('commercial api', () => {
  describe('getRequests', () => {
    it('devuelve las solicitudes de GET /requests', async () => {
      apiClientMock.get.mockResolvedValue({ data: [{ id: 'r1' }] });

      await expect(getRequests()).resolves.toEqual([{ id: 'r1' }]);
      expect(apiClientMock.get).toHaveBeenCalledWith('/requests');
    });

    it('traduce cualquier error a un mensaje genérico', async () => {
      apiClientMock.get.mockRejectedValue(new Error('network down'));

      await expect(getRequests()).rejects.toThrow(
        'No se pudieron cargar las solicitudes.',
      );
    });
  });

  describe('getQuotes', () => {
    it('sin status, pide GET /quotes sin params', async () => {
      apiClientMock.get.mockResolvedValue({ data: [] });

      await getQuotes();

      expect(apiClientMock.get).toHaveBeenCalledWith('/quotes', {
        params: undefined,
      });
    });

    it('con status, lo manda como query param', async () => {
      apiClientMock.get.mockResolvedValue({ data: [] });

      await getQuotes('approved');

      expect(apiClientMock.get).toHaveBeenCalledWith('/quotes', {
        params: { status: 'approved' },
      });
    });

    it('traduce cualquier error a un mensaje genérico', async () => {
      apiClientMock.get.mockRejectedValue(new Error('boom'));

      await expect(getQuotes()).rejects.toThrow(
        'No se pudieron cargar las cotizaciones.',
      );
    });
  });

  describe('createRequest', () => {
    it('postea el payload a POST /requests', async () => {
      const created = { id: 'r1' };
      apiClientMock.post.mockResolvedValue({ data: created });
      const payload = { customerId: 'c1', piece: 'Eje', quantity: 5 };

      await expect(createRequest(payload)).resolves.toBe(created);
      expect(apiClientMock.post).toHaveBeenCalledWith('/requests', payload);
    });

    it('traduce cualquier error a un mensaje genérico', async () => {
      apiClientMock.post.mockRejectedValue(new Error('boom'));

      await expect(
        createRequest({ customerId: 'c1', piece: 'Eje', quantity: 5 }),
      ).rejects.toThrow('No se pudo crear la solicitud.');
    });
  });

  describe('createQuote', () => {
    it('postea el payload a POST /quotes', async () => {
      const created = { id: 'q1' };
      apiClientMock.post.mockResolvedValue({ data: created });
      const payload = { requestId: 'r1', amount: 1500 };

      await expect(createQuote(payload)).resolves.toBe(created);
      expect(apiClientMock.post).toHaveBeenCalledWith('/quotes', payload);
    });

    it('traduce cualquier error a un mensaje genérico', async () => {
      apiClientMock.post.mockRejectedValue(new Error('boom'));

      await expect(
        createQuote({ requestId: 'r1', amount: 1500 }),
      ).rejects.toThrow('No se pudo crear la cotización.');
    });
  });

  describe('approveQuote', () => {
    it('patchea /quotes/:id/approve', async () => {
      const approved = { id: 'q1', status: 'approved' };
      apiClientMock.patch.mockResolvedValue({ data: approved });

      await expect(approveQuote('q1')).resolves.toBe(approved);
      expect(apiClientMock.patch).toHaveBeenCalledWith('/quotes/q1/approve');
    });

    it('traduce cualquier error a un mensaje genérico', async () => {
      apiClientMock.patch.mockRejectedValue(new Error('boom'));

      await expect(approveQuote('q1')).rejects.toThrow(
        'No se pudo aprobar la cotización.',
      );
    });
  });

  describe('rejectQuote', () => {
    it('patchea /quotes/:id/reject', async () => {
      const rejected = { id: 'q1', status: 'rejected' };
      apiClientMock.patch.mockResolvedValue({ data: rejected });

      await expect(rejectQuote('q1')).resolves.toBe(rejected);
      expect(apiClientMock.patch).toHaveBeenCalledWith('/quotes/q1/reject');
    });

    it('traduce cualquier error a un mensaje genérico', async () => {
      apiClientMock.patch.mockRejectedValue(new Error('boom'));

      await expect(rejectQuote('q1')).rejects.toThrow(
        'No se pudo rechazar la cotización.',
      );
    });
  });
});
