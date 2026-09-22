import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

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

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import {
  getFlowerImageUrl,
  getSellerFlowers,
  updateSellerFlower,
  type FlowerListing,
} from '../../services/flower';

const commaSeparatedToArray = (
  value: string
) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export default function SellerEditProductScreen() {
  const params =
    useLocalSearchParams<{
      flowerId?: string | string[];
    }>();

  const flowerId =
    Array.isArray(params.flowerId)
      ? params.flowerId[0]
      : params.flowerId;

  const [flower, setFlower] =
    useState<FlowerListing | null>(null);

  const [name, setName] =
    useState('');

  const [
    description,
    setDescription,
  ] = useState('');

  const [price, setPrice] =
    useState('');

  const [category, setCategory] =
    useState('');

  const [occasion, setOccasion] =
    useState('');

  const [
    flowerTypes,
    setFlowerTypes,
  ] = useState('');

  const [colors, setColors] =
    useState('');

  const [
    isAvailable,
    setIsAvailable,
  ] = useState(true);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadProduct =
    useCallback(async () => {
      if (!flowerId) {
        setError(
          'Flower ID is missing.'
        );
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const flowers =
          await getSellerFlowers();

        const selectedFlower =
          flowers.find(
            (item) =>
              item._id === flowerId
          );

        if (!selectedFlower) {
          setError(
            'Flower listing was not found.'
          );
          return;
        }

        setFlower(selectedFlower);

        setName(
          selectedFlower.name || ''
        );

        setDescription(
          selectedFlower.description ||
            ''
        );

        setPrice(
          String(
            selectedFlower.price ?? ''
          )
        );

        setCategory(
          selectedFlower.category || ''
        );

        setOccasion(
          (
            selectedFlower.occasion ||
            []
          ).join(', ')
        );

        setFlowerTypes(
          (
            selectedFlower.flowerTypes ||
            []
          ).join(', ')
        );

        setColors(
          (
            selectedFlower.colors || []
          ).join(', ')
        );

        setIsAvailable(
          selectedFlower.isAvailable
        );
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to load product.';

        setError(message);
      } finally {
        setLoading(false);
      }
    }, [flowerId]);

useEffect(() => {
  let active = true;

  const fetchProduct = async () => {
    if (!flowerId) {
      if (active) {
        setError('Flower ID is missing.');
        setLoading(false);
      }
      return;
    }

    try {
      const flowers =
        await getSellerFlowers();

      if (!active) {
        return;
      }

      const selectedFlower =
        flowers.find(
          (item) =>
            item._id === flowerId
        );

      if (!selectedFlower) {
        setError(
          'Flower listing was not found.'
        );
        return;
      }

      setFlower(selectedFlower);

      setName(
        selectedFlower.name || ''
      );

      setDescription(
        selectedFlower.description ||
          ''
      );

      setPrice(
        String(
          selectedFlower.price ?? ''
        )
      );

      setCategory(
        selectedFlower.category || ''
      );

      setOccasion(
        (
          selectedFlower.occasion ||
          []
        ).join(', ')
      );

      setFlowerTypes(
        (
          selectedFlower.flowerTypes ||
          []
        ).join(', ')
      );

      setColors(
        (
          selectedFlower.colors || []
        ).join(', ')
      );

      setIsAvailable(
        selectedFlower.isAvailable
      );

      setError(null);
    } catch (err: unknown) {
      if (!active) {
        return;
      }

      const message =
        err instanceof Error
          ? err.message
          : 'Unable to load product.';

      setError(message);
    } finally {
      if (active) {
        setLoading(false);
      }
    }
  };

  fetchProduct();

  return () => {
    active = false;
  };
}, [flowerId]);

  const handleSave =
    async () => {
      if (!flowerId) {
        Alert.alert(
          'Update Failed',
          'Flower ID is missing.'
        );
        return;
      }

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
          'Product Name Required',
          'Please enter the product name.'
        );
        return;
      }

      if (!trimmedDescription) {
        Alert.alert(
          'Description Required',
          'Please enter the product description.'
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
          'Please enter a valid product price.'
        );
        return;
      }

      if (!trimmedCategory) {
        Alert.alert(
          'Category Required',
          'Please enter the product category.'
        );
        return;
      }

      try {
        setSaving(true);

        await updateSellerFlower(
          flowerId,
          {
            name: trimmedName,

            description:
              trimmedDescription,

            price: numericPrice,

            category:
              trimmedCategory,

            occasion:
              commaSeparatedToArray(
                occasion
              ),

            flowerTypes:
              commaSeparatedToArray(
                flowerTypes
              ),

            colors:
              commaSeparatedToArray(
                colors
              ),

            isAvailable,
          }
        );

        Alert.alert(
          'Product Updated',
          'Your flower listing has been updated successfully.',
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
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to update product.';

        Alert.alert(
          'Update Failed',
          message
        );
      } finally {
        setSaving(false);
      }
    };

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#74A485"
        />

        <Text
          style={styles.loadingText}
        >
          Loading product...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !flower) {
    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
      >
        <Text
          style={styles.errorTitle}
        >
          Unable to load product
        </Text>

        <Text
          style={styles.errorText}
        >
          {error ||
            'Flower listing was not found.'}
        </Text>

        <Pressable
          style={styles.retryButton}
          onPress={loadProduct}
        >
          <Text
            style={styles.retryText}
          >
            Try Again
          </Text>
        </Pressable>

        <Pressable
          style={styles.backErrorButton}
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={
              styles.backErrorText
            }
          >
            Back to Products
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const firstImage =
    flower.images?.[0];

  const imageUrl =
    firstImage
      ? getFlowerImageUrl(
          firstImage
        )
      : null;

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
          <View
            style={
              styles.headerCircleOne
            }
          />

          <View
            style={
              styles.headerCircleTwo
            }
          />

          <View
            style={styles.headerRow}
          >
            <Pressable
              style={
                styles.backButton
              }
              onPress={() =>
                router.back()
              }
            >
              <Text
                style={
                  styles.backButtonText
                }
              >
                ‹
              </Text>
            </Pressable>

            <View
              style={
                styles.headerTitleArea
              }
            >
              <Text
                style={
                  styles.headerTitle
                }
              >
                Edit Product
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Update your bouquet
                listing
              </Text>
            </View>

            <View
              style={
                styles.headerSpacer
              }
            />
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={styles.formCard}
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Product Photo
            </Text>

            {imageUrl ? (
              <Image
                source={{
                  uri: imageUrl,
                }}
                style={
                  styles.productImage
                }
                resizeMode="cover"
              />
            ) : (
              <View
                style={
                  styles.imagePlaceholder
                }
              >
                <Text
                  style={
                    styles.imagePlaceholderIcon
                  }
                >
                  🌸
                </Text>

                <Text
                  style={
                    styles.imagePlaceholderText
                  }
                >
                  No product photo
                </Text>
              </View>
            )}

            <Text
              style={styles.imageNote}
            >
              The current product photo
              will be kept when saving
              changes.
            </Text>

            <Text
              style={styles.label}
            >
              Product Name
            </Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter product name"
              placeholderTextColor="#AAAAAA"
              style={styles.input}
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
              placeholder="Describe your bouquet"
              placeholderTextColor="#AAAAAA"
              multiline
              textAlignVertical="top"
              style={[
                styles.input,
                styles.textArea,
              ]}
            />

            <Text
              style={styles.label}
            >
              Price
            </Text>

            <View
              style={
                styles.priceContainer
              }
            >
              <Text
                style={
                  styles.currencyText
                }
              >
                ₱
              </Text>

              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor="#AAAAAA"
                keyboardType="decimal-pad"
                style={
                  styles.priceInput
                }
              />
            </View>

            <Text
              style={styles.label}
            >
              Category
            </Text>

            <TextInput
              value={category}
              onChangeText={
                setCategory
              }
              placeholder="Example: Bouquet"
              placeholderTextColor="#AAAAAA"
              style={styles.input}
            />

            <Text
              style={styles.label}
            >
              Occasions
            </Text>

            <TextInput
              value={occasion}
              onChangeText={
                setOccasion
              }
              placeholder="Birthday, Anniversary"
              placeholderTextColor="#AAAAAA"
              style={styles.input}
            />

            <Text
              style={styles.helperText}
            >
              Separate multiple
              occasions with commas.
            </Text>

            <Text
              style={styles.label}
            >
              Flower Types
            </Text>

            <TextInput
              value={flowerTypes}
              onChangeText={
                setFlowerTypes
              }
              placeholder="Rose, Tulip, Sunflower"
              placeholderTextColor="#AAAAAA"
              style={styles.input}
            />

            <Text
              style={styles.helperText}
            >
              Separate multiple flower
              types with commas.
            </Text>

            <Text
              style={styles.label}
            >
              Colors
            </Text>

            <TextInput
              value={colors}
              onChangeText={setColors}
              placeholder="Red, White, Pink"
              placeholderTextColor="#AAAAAA"
              style={styles.input}
            />

            <Text
              style={styles.helperText}
            >
              Separate multiple colors
              with commas.
            </Text>

            <View
              style={
                styles.availabilityCard
              }
            >
              <View
                style={
                  styles.availabilityTextArea
                }
              >
                <Text
                  style={
                    styles.availabilityTitle
                  }
                >
                  Product Availability
                </Text>

                <Text
                  style={
                    styles.availabilitySubtitle
                  }
                >
                  {isAvailable
                    ? 'Customers can order this bouquet.'
                    : 'This bouquet will be unavailable for ordering.'}
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
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,

              (pressed || saving) &&
                styles.buttonPressed,
            ]}
            onPress={handleSave}
            disabled={saving}
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
                Save Changes
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.cancelButton}
            onPress={() =>
              router.back()
            }
            disabled={saving}
          >
            <Text
              style={
                styles.cancelButtonText
              }
            >
              Cancel
            </Text>
          </Pressable>

          <View
            style={
              styles.bottomSpacer
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#F5F6F5',
    },

    loadingContainer: {
      flex: 1,
      backgroundColor:
        '#F5F6F5',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 30,
    },

    loadingText: {
      marginTop: 12,
      color: '#888888',
      fontSize: 12,
    },

    errorTitle: {
      color: '#444444',
      fontSize: 17,
      fontWeight: '800',
      textAlign: 'center',
    },

    errorText: {
      color: '#888888',
      fontSize: 11,
      lineHeight: 17,
      textAlign: 'center',
      marginTop: 8,
    },

    retryButton: {
      marginTop: 20,
      backgroundColor:
        '#74A485',
      borderRadius: 12,
      paddingHorizontal: 25,
      paddingVertical: 12,
    },

    retryText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 11,
    },

    backErrorButton: {
      marginTop: 10,
      padding: 10,
    },

    backErrorText: {
      color: '#659676',
      fontSize: 11,
      fontWeight: '700',
    },

    header: {
      backgroundColor:
        '#74A485',
      paddingHorizontal: 17,
      paddingTop: 18,
      paddingBottom: 20,
      overflow: 'hidden',
    },

    headerCircleOne: {
      position: 'absolute',
      width: 170,
      height: 170,
      borderRadius: 85,
      top: -95,
      right: -40,
      backgroundColor:
        'rgba(255,255,255,0.06)',
    },

    headerCircleTwo: {
      position: 'absolute',
      width: 110,
      height: 110,
      borderRadius: 55,
      bottom: -70,
      left: -30,
      backgroundColor:
        'rgba(255,255,255,0.05)',
    },

    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        'rgba(255,255,255,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    backButtonText: {
      color: '#FFFFFF',
      fontSize: 34,
      lineHeight: 36,
      marginTop: -3,
    },

    headerTitleArea: {
      flex: 1,
      alignItems: 'center',
    },

    headerTitle: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '800',
    },

    headerSubtitle: {
      color:
        'rgba(255,255,255,0.80)',
      fontSize: 9,
      marginTop: 3,
    },

    headerSpacer: {
      width: 42,
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      padding: 17,
    },

    formCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 17,
      padding: 16,

      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },

    sectionTitle: {
      color: '#444444',
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 10,
    },

    productImage: {
      width: '100%',
      height: 190,
      borderRadius: 13,
      backgroundColor:
        '#EFF1EF',
    },

    imagePlaceholder: {
      width: '100%',
      height: 170,
      borderRadius: 13,
      backgroundColor:
        '#EFF4F0',
      alignItems: 'center',
      justifyContent: 'center',
    },

    imagePlaceholderIcon: {
      fontSize: 35,
    },

    imagePlaceholderText: {
      color: '#999999',
      fontSize: 10,
      marginTop: 7,
    },

    imageNote: {
      color: '#999999',
      fontSize: 9,
      lineHeight: 14,
      marginTop: 7,
    },

    label: {
      color: '#4C4C4C',
      fontSize: 10,
      fontWeight: '700',
      marginTop: 17,
      marginBottom: 7,
    },

    input: {
      minHeight: 45,
      backgroundColor:
        '#F8F9F8',
      borderWidth: 1,
      borderColor:
        '#E5E8E5',
      borderRadius: 11,
      paddingHorizontal: 13,
      paddingVertical: 11,
      color: '#333333',
      fontSize: 11,
    },

    textArea: {
      minHeight: 105,
    },

    priceContainer: {
      minHeight: 45,
      backgroundColor:
        '#F8F9F8',
      borderWidth: 1,
      borderColor:
        '#E5E8E5',
      borderRadius: 11,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 13,
    },

    currencyText: {
      color: '#659676',
      fontSize: 14,
      fontWeight: '800',
      marginRight: 7,
    },

    priceInput: {
      flex: 1,
      color: '#333333',
      fontSize: 11,
      paddingVertical: 11,
    },

    helperText: {
      color: '#AAAAAA',
      fontSize: 8,
      marginTop: 5,
    },

    availabilityCard: {
      marginTop: 22,
      backgroundColor:
        '#F5F9F6',
      borderRadius: 12,
      paddingHorizontal: 13,
      paddingVertical: 13,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    availabilityTextArea: {
      flex: 1,
      paddingRight: 12,
    },

    availabilityTitle: {
      color: '#4C4C4C',
      fontSize: 10,
      fontWeight: '700',
    },

    availabilitySubtitle: {
      color: '#999999',
      fontSize: 8,
      lineHeight: 13,
      marginTop: 3,
    },

    saveButton: {
      minHeight: 50,
      borderRadius: 13,
      backgroundColor:
        '#74A485',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 17,
    },

    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },

    buttonPressed: {
      opacity: 0.7,
    },

    cancelButton: {
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 5,
    },

    cancelButtonText: {
      color: '#888888',
      fontSize: 10,
      fontWeight: '600',
    },

    bottomSpacer: {
      height: 20,
    },
  });