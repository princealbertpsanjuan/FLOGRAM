import { useEffect, useState } from 'react';

import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { getUploadUrl } from '../../utils/media';

/*
 * =========================================================
 * UPLOADED REQUIREMENTS (Admin verification)
 * =========================================================
 *
 * Thumbnails of the documents a Seller/Rider uploaded.
 * Tap one to see it full screen before approving.
 * =========================================================
 */

export type RequirementDocuments = {
  status?: string;
  submittedAt?: string;
  files: { key: string; label: string; path: string }[];
} | null;

export default function RequirementDocumentsView({
  documents,
  loading = false,
}: {
  documents?: RequirementDocuments;
  loading?: boolean;
}) {
  const [preview, setPreview] = useState<{ label: string; uri: string } | null>(null);

  useEffect(() => {
    setPreview(null);
  }, [documents]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Uploaded Requirements</Text>

      {loading ? (
        <ActivityIndicator color="#5552B9" style={{ marginVertical: 16 }} />
      ) : !documents || documents.files.length === 0 ? (
        <Text style={styles.empty}>No documents were uploaded yet.</Text>
      ) : (
        <View style={styles.grid}>
          {documents.files.map(file => {
            const uri = getUploadUrl(file.path);

            return (
              <Pressable
                key={file.key}
                accessibilityRole="imagebutton"
                accessibilityLabel={`View ${file.label}`}
                onPress={() => uri && setPreview({ label: file.label, uri })}
                style={styles.item}
              >
                {uri ? (
                  <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]}>
                    <Ionicons name="document-outline" size={22} color="#77737B" />
                  </View>
                )}
                <Text style={styles.label} numberOfLines={2}>
                  {file.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Modal visible={preview !== null} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPreview(null)}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>{preview?.label}</Text>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </View>
          {preview ? <Image source={{ uri: preview.uri }} style={styles.previewImage} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECECF0',
    backgroundColor: '#FFFFFF',
  },
  title: { marginBottom: 10, color: '#3B3940', fontSize: 15, fontWeight: '800' },
  empty: { color: '#77737B', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: { width: 96 },
  thumb: { width: 96, height: 96, borderRadius: 12, backgroundColor: '#F1F1F5' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 5, color: '#3B3940', fontSize: 11, fontWeight: '600' },
  backdrop: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.9)' },
  previewHeader: {
    position: 'absolute',
    top: 48,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  previewTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  previewImage: { width: '100%', height: '80%' },
});
