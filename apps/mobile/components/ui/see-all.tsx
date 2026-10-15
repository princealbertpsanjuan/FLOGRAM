import { useEffect, useState, type ReactNode } from 'react';

import { Pressable, StyleSheet, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { ROLE_ACCENT, type Role } from './state-views';

/*
 * =========================================================
 * "SHOW 5 + SEE ALL" LISTS
 * =========================================================
 *
 * Adviser feedback: long lists show the first 5 records and
 * a "See all (N)" button that expands the list in place
 * ("Show less" collapses it again).
 *
 * useSeeAll(items, { resetKey })
 *   → { visible, expanded, hiddenCount, toggle }
 *     resetKey: collapse again when a tab/filter changes.
 *
 * <SeeAllButton state={...} role="seller" />
 *   renders nothing when there are 5 or fewer items.
 *
 * <SeeAllList items renderItem role /> wraps both.
 * =========================================================
 */

export const SEE_ALL_LIMIT = 5;

export type SeeAllState<T> = {
  visible: T[];
  expanded: boolean;
  total: number;
  hiddenCount: number;
  toggle: () => void;
};

export function useSeeAll<T>(
  items: readonly T[] | null | undefined,
  { limit = SEE_ALL_LIMIT, resetKey }: { limit?: number; resetKey?: unknown } = {}
): SeeAllState<T> {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [resetKey]);

  const list = (items ?? []) as T[];
  const visible = expanded ? list : list.slice(0, limit);

  return {
    visible,
    expanded,
    total: list.length,
    hiddenCount: Math.max(0, list.length - limit),
    toggle: () => setExpanded(value => !value),
  };
}

export function SeeAllButton({
  state,
  role,
  label,
}: {
  state: Pick<SeeAllState<unknown>, 'expanded' | 'total' | 'hiddenCount' | 'toggle'>;
  role: Role;
  label?: string;
}) {
  if (state.hiddenCount <= 0) {
    return null;
  }

  const accent = ROLE_ACCENT[role];

  return (
    <Pressable
      onPress={state.toggle}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { borderColor: `${accent}55`, backgroundColor: `${accent}12` },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.text, { color: accent }]}>
        {state.expanded ? 'Show less' : `${label ?? 'See all'} (${state.total})`}
      </Text>
      <Ionicons name={state.expanded ? 'chevron-up' : 'chevron-down'} size={16} color={accent} />
    </Pressable>
  );
}

export function SeeAllList<T>({
  items,
  renderItem,
  role,
  resetKey,
  limit,
  label,
}: {
  items: readonly T[] | null | undefined;
  renderItem: (item: T, index: number) => ReactNode;
  role: Role;
  resetKey?: unknown;
  limit?: number;
  label?: string;
}) {
  const state = useSeeAll(items, { resetKey, limit });

  return (
    <>
      {state.visible.map((item, index) => renderItem(item, index))}
      <SeeAllButton state={state} role={role} label={label} />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'stretch',
    marginTop: 4,
    marginBottom: 12,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  text: {
    fontSize: 14,
    fontWeight: '800',
  },
});
