/*
 * =========================================================
 * FP-GROWTH (Frequent Pattern Growth)
 * =========================================================
 *
 * Han, Pei & Yin (2000). Finds frequent itemsets without
 * candidate generation:
 *
 * 1. Count item frequencies; drop items below minSupport.
 * 2. Insert each transaction (items sorted by frequency)
 *    into a prefix tree (FP-tree) with a header table
 *    linking nodes of the same item.
 * 3. For each item (least frequent first), build its
 *    conditional pattern base from the paths leading to it,
 *    build a conditional FP-tree, and recurse.
 *
 * Association rules X -> Y are then generated from the
 * frequent itemsets with:
 *
 *   support(X∪Y)  = count(X∪Y) / transactions
 *   confidence    = count(X∪Y) / count(X)
 *   lift          = confidence / support(Y)
 * =========================================================
 */

class FpNode {
  constructor(item, parent) {
    this.item = item;
    this.count = 0;
    this.parent = parent;
    this.children = new Map();
    this.next = null;
  }
}

const buildTree = (transactions, minCount) => {
  const frequency = new Map();

  transactions.forEach(({ items, count }) => {
    items.forEach((item) => frequency.set(item, (frequency.get(item) || 0) + count));
  });

  const frequent = new Map(
    [...frequency.entries()].filter(([, value]) => value >= minCount)
  );

  const root = new FpNode(null, null);
  const header = new Map();
  const lastLink = new Map();

  const order = (a, b) =>
    frequent.get(b) - frequent.get(a) || String(a).localeCompare(String(b));

  transactions.forEach(({ items, count }) => {
    const sorted = [...new Set(items)].filter((item) => frequent.has(item)).sort(order);
    let node = root;

    sorted.forEach((item) => {
      let child = node.children.get(item);

      if (!child) {
        child = new FpNode(item, node);
        node.children.set(item, child);

        if (lastLink.has(item)) {
          lastLink.get(item).next = child;
        } else {
          header.set(item, child);
        }

        lastLink.set(item, child);
      }

      child.count += count;
      node = child;
    });
  });

  return { header, frequent };
};

const mine = (transactions, minCount, suffix, results) => {
  const { header, frequent } = buildTree(transactions, minCount);

  // Least frequent first.
  const items = [...frequent.keys()].sort(
    (a, b) => frequent.get(a) - frequent.get(b) || String(b).localeCompare(String(a))
  );

  items.forEach((item) => {
    const itemset = [item, ...suffix];
    results.push({ items: itemset, count: frequent.get(item) });

    // Conditional pattern base.
    const base = [];
    let node = header.get(item);

    while (node) {
      const path = [];
      let parent = node.parent;

      while (parent && parent.item !== null) {
        path.push(parent.item);
        parent = parent.parent;
      }

      if (path.length) {
        base.push({ items: path, count: node.count });
      }

      node = node.next;
    }

    if (base.length) {
      mine(base, minCount, itemset, results);
    }
  });
};

/*
 * transactions: array of item arrays, e.g.
 *   [["flower:a", "addon:chocolate"], ["flower:a"]]
 * minSupport: fraction 0..1 of transactions (default 0.02),
 *   but never fewer than 2 transactions.
 */
export const fpGrowth = (transactions, { minSupport = 0.02, minCount: explicitMinCount } = {}) => {
  const cleaned = transactions
    .map((items) => [...new Set((items || []).filter(Boolean).map(String))])
    .filter((items) => items.length > 0);

  const minCount =
    explicitMinCount ?? Math.max(2, Math.ceil(minSupport * cleaned.length));

  const results = [];

  mine(
    cleaned.map((items) => ({ items, count: 1 })),
    minCount,
    [],
    results
  );

  return {
    transactionCount: cleaned.length,
    minCount,
    itemsets: results
      .map((itemset) => ({
        items: [...itemset.items].sort(),
        count: itemset.count,
        support: cleaned.length ? itemset.count / cleaned.length : 0,
      }))
      .sort((a, b) => b.count - a.count || a.items.length - b.items.length),
  };
};

const subsets = (items) => {
  const output = [];
  const total = 1 << items.length;

  for (let mask = 1; mask < total - 1; mask += 1) {
    output.push(items.filter((_, index) => mask & (1 << index)));
  }

  return output;
};

export const associationRules = (
  { itemsets, transactionCount },
  { minConfidence = 0.3 } = {}
) => {
  const countByKey = new Map(itemsets.map((itemset) => [itemset.items.join("|"), itemset.count]));
  const rules = [];

  itemsets
    .filter((itemset) => itemset.items.length >= 2)
    .forEach((itemset) => {
      subsets(itemset.items).forEach((antecedent) => {
        const consequent = itemset.items.filter((item) => !antecedent.includes(item));
        const antecedentCount = countByKey.get([...antecedent].sort().join("|"));
        const consequentCount = countByKey.get([...consequent].sort().join("|"));

        if (!antecedentCount || !consequentCount) {
          return;
        }

        const confidence = itemset.count / antecedentCount;
        const consequentSupport = consequentCount / transactionCount;

        if (confidence < minConfidence) {
          return;
        }

        rules.push({
          antecedent,
          consequent,
          count: itemset.count,
          support: Number((itemset.count / transactionCount).toFixed(4)),
          confidence: Number(confidence.toFixed(4)),
          lift: Number((confidence / consequentSupport).toFixed(3)),
        });
      });
    });

  return rules.sort((a, b) => b.lift - a.lift || b.confidence - a.confidence || b.count - a.count);
};
