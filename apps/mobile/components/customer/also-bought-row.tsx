import { useEffect, useState } from 'react';

import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { router } from 'expo-router';

import { getAlsoBought } from '../../services/analytics';
import { getFlowerImageUrl } from '../../services/flower';

type RelatedFlower = {
  _id: string;
  name: string;
  price: number;
  images?: string[];
  florist?: { shopName?: string } | string | null;
};

/*
 * "Customers also bought" — products that FP-Growth found
 * in the same checkouts as this bouquet.
 */
export default function AlsoBoughtRow({ flowerId }: { flowerId?: string | null }) {
  const [flowers, setFlowers] = useState<RelatedFlower[]>([]);

  useEffect(() => {
    if (!flowerId) {
      return;
    }

    let active = true;

    getAlsoBought<RelatedFlower>(flowerId)
      .then(data => {
        if (active) {
          setFlowers(data.flowers || []);
        }
      })
      .catch(() => {
        if (active) {
          setFlowers([]);
        }
      });

    return () => {
      active = false;
    };
  }, [flowerId]);

  if (flowers.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Customers also bought</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {flowers.map(flower => {
          const image = getFlowerImageUrl(flower.images?.[0]);

          return (
            <Pressable
              key={flower._id}
              onPress={() =>
                router.push({
                  pathname: '/(customer)/customer-product-details',
                  params: { flowerId: flower._id },
                } as never)
              }
              style={styles.card}
            >
              {image ? (
                <Image
                  source={{ uri: image }}
                  style={styles.image}
                />
              ) : (
                <View style={[styles.image, { backgroundColor: '#FCE8F0' }]} />
              )}
              <Text
                numberOfLines={1}
                style={styles.name}
              >
                {flower.name}
              </Text>
              <Text style={styles.price}>
                ₱{Number(flower.price || 0).toLocaleString('en-PH')}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 18 },
  title: { marginHorizontal: 20, marginBottom: 10, color: '#3B3438', fontSize: 16, fontWeight: '800' },
  row: { gap: 12, paddingHorizontal: 20 },
  card: { width: 130 },
  image: { width: 130, height: 130, borderRadius: 16, backgroundColor: '#F3EEF1' },
  name: { marginTop: 6, color: '#3B3438', fontSize: 13, fontWeight: '700' },
  price: { marginTop: 2, color: '#DF628F', fontSize: 13, fontWeight: '800' },
});
