import { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import {
  createSellerFlower,
} from '../../services/flower';

export default function SellerAddProductScreen() {
  const [name, setName] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [price, setPrice] =
    useState('');

  const [category, setCategory] =
    useState('');

  const [occasion, setOccasion] =
    useState('');

  const [flowerTypes, setFlowerTypes] =
    useState('');

  const [colors, setColors] =
    useState('');

  const [isAvailable, setIsAvailable] =
    useState(true);

  const [images, setImages] =
    useState<string[]>([]);

  const [saving, setSaving] =
    useState(false);

  const parseList = (
    value: string
  ) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const pickImages = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow photo access to upload bouquet images.'
      );

      return;
    }

    const remaining =
      5 - images.length;

    if (remaining <= 0) {
      Alert.alert(
        'Maximum Images',
        'You can upload up to 5 images.'
      );

      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.8,
      });

    if (result.canceled) {
      return;
    }

    const selected =
      result.assets
        .slice(0, remaining)
        .map((asset) => asset.uri);

    setImages((current) => [
      ...current,
      ...selected,
    ]);
  };

  const removeImage = (
    index: number
  ) => {
    setImages((current) =>
      current.filter(
        (_, currentIndex) =>
          currentIndex !== index
      )
    );
  };

  const handleSave = async () => {
    const trimmedName =
      name.trim();

    const trimmedDescription =
      description.trim();

    const trimmedCategory =
      category.trim();

    const numericPrice =
      Number(price);

    if (!trimmedName) {
      Alert.alert(
        'Missing Product Name',
        'Please enter the bouquet name.'
      );

      return;
    }

    if (!trimmedDescription) {
      Alert.alert(
        'Missing Description',
        'Please enter a product description.'
      );

      return;
    }

    if (
      !price.trim() ||
      Number.isNaN(numericPrice) ||
      numericPrice < 0
    ) {
      Alert.alert(
        'Invalid Price',
        'Please enter a valid non-negative price.'
      );

      return;
    }

    if (!trimmedCategory) {
      Alert.alert(
        'Missing Category',
        'Please enter a product category.'
      );

      return;
    }

    try {
      setSaving(true);

      await createSellerFlower({
        name: trimmedName,
        description:
          trimmedDescription,
        price: numericPrice,
        category:
          trimmedCategory,

        occasion:
          parseList(occasion),

        flowerTypes:
          parseList(flowerTypes),

        colors:
          parseList(colors),

        isAvailable,

        images,
      });

      Alert.alert(
        'Product Added',
        'Your bouquet listing was created successfully.',
        [
          {
            text: 'OK',
            onPress: () =>
              router.replace(
                '/(seller)/seller-products'
              ),
          },
        ]
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to create product.';

      Alert.alert(
        'Unable to Add Product',
        message
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={styles.backText}
            >
              ‹
            </Text>
          </Pressable>

          <View style={styles.headerText}>
            <Text
              style={styles.headerTitle}
            >
              Add Product
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              Create a new bouquet
              listing
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={
            styles.content
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
        >
          <Text
            style={styles.sectionTitle}
          >
            Product Photos
          </Text>

          <Text
            style={styles.helper}
          >
            Add up to 5 bouquet photos.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.imageRow
            }
          >
            {images.map(
              (uri, index) => (
                <View
                  key={`${uri}-${index}`}
                  style={
                    styles.imageWrapper
                  }
                >
                  <Image
                    source={{ uri }}
                    style={
                      styles.imagePreview
                    }
                  />

                  <Pressable
                    style={
                      styles.removeImage
                    }
                    onPress={() =>
                      removeImage(index)
                    }
                  >
                    <Text
                      style={
                        styles.removeImageText
                      }
                    >
                      ×
                    </Text>
                  </Pressable>
                </View>
              )
            )}

            {images.length < 5 ? (
              <Pressable
                style={
                  styles.addImageButton
                }
                onPress={pickImages}
              >
                <Text
                  style={
                    styles.addImagePlus
                  }
                >
                  +
                </Text>

                <Text
                  style={
                    styles.addImageText
                  }
                >
                  Add Photo
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>

          <Field
            label="Product Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Romantic Red Rose Bouquet"
          />

          <Text
            style={styles.label}
          >
            Description
          </Text>

          <TextInput
            value={description}
            onChangeText={
              setDescription
            }
            placeholder="Describe your bouquet..."
            placeholderTextColor="#AAAAAA"
            multiline
            textAlignVertical="top"
            style={[
              styles.input,
              styles.descriptionInput,
            ]}
          />

          <Field
            label="Price"
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          <Field
            label="Category"
            value={category}
            onChangeText={setCategory}
            placeholder="e.g. Bouquet"
          />

          <Field
            label="Occasions"
            value={occasion}
            onChangeText={
              setOccasion
            }
            placeholder="Birthday, Anniversary"
            helper="Separate multiple values with commas."
          />

          <Field
            label="Flower Types"
            value={flowerTypes}
            onChangeText={
              setFlowerTypes
            }
            placeholder="Rose, Sunflower"
            helper="Separate multiple values with commas."
          />

          <Field
            label="Colors"
            value={colors}
            onChangeText={setColors}
            placeholder="Red, White, Pink"
            helper="Separate multiple values with commas."
          />

          <View
            style={
              styles.availabilityCard
            }
          >
            <View style={{ flex: 1 }}>
              <Text
                style={
                  styles.availabilityTitle
                }
              >
                Available for Order
              </Text>

              <Text
                style={
                  styles.availabilityText
                }
              >
                Customers can order this
                bouquet immediately.
              </Text>
            </View>

            <Switch
              value={isAvailable}
              onValueChange={
                setIsAvailable
              }
              trackColor={{
                false: '#DADADA',
                true: '#A8CCB4',
              }}
              thumbColor={
                isAvailable
                  ? '#74A485'
                  : '#F5F5F5'
              }
            />
          </View>

          <Pressable
            style={[
              styles.saveButton,
              saving &&
                styles.disabledButton,
            ]}
            disabled={saving}
            onPress={handleSave}
          >
            {saving ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={
                  styles.saveButtonText
                }
              >
                Add Product
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  helper,
}: {
  label: string;
  value: string;
  onChangeText: (
    value: string
  ) => void;
  placeholder: string;
  keyboardType?:
    | 'default'
    | 'decimal-pad';
  helper?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={
          onChangeText
        }
        placeholder={placeholder}
        placeholderTextColor="#AAAAAA"
        keyboardType={
          keyboardType ?? 'default'
        }
        style={styles.input}
      />

      {helper ? (
        <Text
          style={styles.fieldHelper}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F5',
  },

  header: {
    backgroundColor: '#74A485',
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor:
      'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  backText: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 32,
  },

  headerText: {
    flex: 1,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },

  headerSubtitle: {
    color:
      'rgba(255,255,255,0.8)',
    fontSize: 10,
    marginTop: 3,
  },

  content: {
    padding: 18,
    paddingBottom: 40,
  },

  sectionTitle: {
    color: '#3E3E3E',
    fontSize: 13,
    fontWeight: '800',
  },

  helper: {
    color: '#999999',
    fontSize: 9,
    marginTop: 4,
  },

  imageRow: {
    gap: 10,
    paddingVertical: 14,
  },

  imageWrapper: {
    width: 105,
    height: 105,
    position: 'relative',
  },

  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },

  removeImage: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor:
      'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  removeImageText: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 19,
  },

  addImageButton: {
    width: 105,
    height: 105,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9EB9A7',
    backgroundColor: '#EDF4EF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addImagePlus: {
    color: '#659676',
    fontSize: 27,
  },

  addImageText: {
    color: '#659676',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },

  field: {
    marginTop: 14,
  },

  label: {
    color: '#494949',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 7,
  },

  input: {
    minHeight: 46,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E7E6',
    borderRadius: 12,
    paddingHorizontal: 13,
    color: '#333333',
    fontSize: 11,
  },

  descriptionInput: {
    minHeight: 105,
    paddingTop: 13,
  },

  fieldHelper: {
    color: '#999999',
    fontSize: 8,
    marginTop: 5,
  },

  availabilityCard: {
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  availabilityTitle: {
    color: '#454545',
    fontSize: 11,
    fontWeight: '700',
  },

  availabilityText: {
    color: '#999999',
    fontSize: 8,
    marginTop: 4,
  },

  saveButton: {
    height: 49,
    borderRadius: 13,
    backgroundColor: '#74A485',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },

  disabledButton: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});