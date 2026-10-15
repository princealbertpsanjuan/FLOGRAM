import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { ROLE_ACCENT } from '../ui/state-views';

/*
 * =========================================================
 * OPTION CHIPS
 * =========================================================
 *
 * Tappable chips for a fixed list of choices.
 *
 * Single select: value = string, onChange(next: string)
 * Multi select:  value = string[], onChange(next: string[])
 *
 * Matching is case-insensitive so older free-text values
 * ("bouquet") still show as selected.
 * =========================================================
 */

const ACCENT = ROLE_ACCENT.seller;

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

type SingleProps = {
  multiple?: false;
  value: string;
  onChange: (next: string) => void;
};

type MultiProps = {
  multiple: true;
  value: string[];
  onChange: (next: string[]) => void;
};

type Props = (SingleProps | MultiProps) & {
  options: readonly string[];
  disabled?: boolean;
  accent?: string;
};

export default function OptionChips(props: Props) {
  const { options, disabled, accent = ACCENT } = props;

  const isSelected = (option: string) =>
    props.multiple
      ? props.value.some(item => same(item, option))
      : same(props.value || '', option);

  const handlePress = (option: string) => {
    if (props.multiple) {
      const selected = props.value.some(item => same(item, option));
      props.onChange(
        selected
          ? props.value.filter(item => !same(item, option))
          : [...props.value, option]
      );
      return;
    }

    props.onChange(option);
  };

  return (
    <View style={styles.wrap}>
      {options.map(option => {
        const selected = isSelected(option);

        return (
          <Pressable
            key={option}
            disabled={disabled}
            onPress={() => handlePress(option)}
            accessibilityRole={props.multiple ? 'checkbox' : 'radio'}
            accessibilityState={{ checked: selected, disabled }}
            style={({ pressed }) => [
              styles.chip,
              selected && { backgroundColor: accent, borderColor: accent },
              pressed && styles.pressed,
              disabled && styles.disabled,
            ]}
          >
            {selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}

            <Text style={[styles.text, selected && styles.textSelected]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D8E5DC',
    backgroundColor: '#FFFFFF',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3F4A44',
  },
  textSelected: {
    color: '#FFFFFF',
  },
});
