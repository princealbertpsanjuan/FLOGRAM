import { Platform } from 'react-native';

import { File as ExpoFile } from 'expo-file-system';

/*
 * =========================================================
 * APPEND A PICKED IMAGE TO FormData (native + web)
 * =========================================================
 *
 * Native (Expo SDK 54+): FormData needs an expo-file-system
 * File; the old { uri, name, type } object fails with
 * "Unsupported FormDataPart implementation".
 *
 * Web (Admin portal): the picker returns a blob:/data: URI,
 * so it is converted to a Blob first.
 * =========================================================
 */
export const appendImageFile = async (formData: FormData, field: string, uri: string, fileName = 'photo.jpg') => {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    const extension = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    formData.append(field, blob, fileName.replace(/\.[a-z0-9]+$/i, `.${extension}`));
    return;
  }

  formData.append(field, new ExpoFile(uri) as unknown as Blob);
};
