import { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { matchNagaBarangays, searchAddresses, type AddressSuggestion } from '../../services/geo';
import { ROLE_ACCENT, type Role } from './state-views';

/*
 * =========================================================
 * ADDRESS INPUT WITH SUGGESTIONS
 * =========================================================
 *
 * Type 2–3 letters (e.g. "TAB") → matching Naga barangays
 * appear instantly, then places from the online search.
 * Choosing one calls onSelect with street / barangay /
 * city / province (+ coordinates when known) so the form
 * can fill its other fields and move the map pin.
 *
 * Drop-in replacement for a TextInput: pass the same
 * value / onChangeText / style / placeholder.
 * =========================================================
 */

export default function AddressAutocomplete({
  value,
  onChangeText,
  onSelect,
  role,
  style,
  containerStyle,
  placeholder,
  ...inputProps
}: Omit<TextInputProps, 'onChangeText' | 'value' | 'style'> & {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  role: Role;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const accent = ROLE_ACCENT[role];
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const skipNext = useRef(false);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }

    const text = value.trim();

    if (!focused || text.length < 2) {
      setSuggestions([]);
      return;
    }

    const local = matchNagaBarangays(text);
    setSuggestions(local);

    if (text.length < 3) {
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      const online = await searchAddresses(text, controller.signal);
      setLoading(false);

      if (controller.signal.aborted) {
        return;
      }

      const seen = new Set(local.map(item => item.label.toLowerCase()));
      setSuggestions([...local, ...online.filter(item => !seen.has(item.label.toLowerCase()))].slice(0, 8));
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [value, focused]);

  const choose = (item: AddressSuggestion) => {
    skipNext.current = true;
    setSuggestions([]);
    onSelect(item);
  };

  return (
    <View style={containerStyle}>
      <TextInput
        {...inputProps}
        value={value}
        onChangeText={text => {
          // Typing again always searches (even if the last pick did not change the value)
          skipNext.current = false;
          onChangeText(text);
        }}
        placeholder={placeholder}
        style={style}
        onFocus={event => {
          setFocused(true);
          inputProps.onFocus?.(event);
        }}
        onBlur={event => {
          setTimeout(() => setFocused(false), 200);
          inputProps.onBlur?.(event);
        }}
      />

      {focused && (suggestions.length > 0 || loading) ? (
        <View style={styles.dropdown}>
          {suggestions.map(item => (
            <Pressable
              key={`${item.label}-${item.latitude ?? ''}`}
              onPress={() => choose(item)}
              style={({ pressed }) => [styles.item, pressed && { backgroundColor: `${accent}14` }]}
            >
              <Ionicons name="location-outline" size={16} color={accent} />
              <Text style={styles.itemText} numberOfLines={2}>{item.label}</Text>
            </Pressable>
          ))}

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color={accent} />
              <Text style={styles.loadingText}>Searching addresses…</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    marginTop: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3E1E8',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F0F4',
  },
  itemText: { flex: 1, color: '#2E2B33', fontSize: 13 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  loadingText: { color: '#77737B', fontSize: 12 },
});
