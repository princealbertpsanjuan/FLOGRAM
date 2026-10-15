import { apiRequest } from './api';

/*
 * Address search and map pin → address.
 * Server: /geo/autocomplete and /geo/reverse.
 */

export type AddressSuggestion = {
  label: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
};

type ApiResponse<T> = { success: boolean; data: T };

/*
 * Naga City barangays: instant suggestions while typing,
 * even before the online search answers.
 */
export const NAGA_BARANGAYS = [
  'Abella', 'Bagumbayan Norte', 'Bagumbayan Sur', 'Balatas', 'Calauag', 'Cararayan', 'Carolina',
  'Concepcion Grande', 'Concepcion Pequeña', 'Dayangdang', 'Del Rosario', 'Dinaga', 'Igualdad Interior',
  'Lerma', 'Liboton', 'Mabolo', 'Pacol', 'Panicuason', 'Peñafrancia', 'Sabang', 'San Felipe',
  'San Francisco', 'San Isidro', 'Santa Cruz', 'Tabuco', 'Tinago', 'Triangulo',
];

const fold = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export const matchNagaBarangays = (text: string): AddressSuggestion[] => {
  const query = fold(text.trim());

  if (query.length < 2) {
    return [];
  }

  return NAGA_BARANGAYS.filter(name => fold(name).startsWith(query) || fold(name).split(' ').some(part => part.startsWith(query)))
    .slice(0, 5)
    .map(name => ({
      label: `${name}, Naga City, Camarines Sur`,
      street: '',
      barangay: name,
      city: 'Naga City',
      province: 'Camarines Sur',
      postalCode: '4400',
      latitude: null,
      longitude: null,
    }));
};

export async function searchAddresses(text: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  const query = text.trim();

  if (query.length < 3) {
    return [];
  }

  try {
    const response = await apiRequest<ApiResponse<{ results: AddressSuggestion[] }>>(
      `/geo/autocomplete?text=${encodeURIComponent(query)}`,
      { method: 'GET', signal }
    );

    return response.data?.results ?? [];
  } catch {
    return [];
  }
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<AddressSuggestion | null> {
  try {
    const response = await apiRequest<ApiResponse<{ address: AddressSuggestion | null }>>(
      `/geo/reverse?latitude=${latitude}&longitude=${longitude}`,
      { method: 'GET' }
    );

    return response.data?.address ?? null;
  } catch {
    return null;
  }
}
