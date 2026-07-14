import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Writes `ics` to a cache file and opens the native share sheet for it. */
export async function shareIcs(ics: string, fileName: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device');
  }

  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(ics);

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/calendar',
    dialogTitle: fileName,
    UTI: 'com.apple.ical.ics',
  });
}
