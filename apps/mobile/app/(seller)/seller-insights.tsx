import { StatusBar, StyleSheet, View } from 'react-native';

import InsightsView from '../../components/analytics/insights-view';
import ScreenHeader from '../../components/ui/screen-header';

/*
 * Seller → Customer Insights
 * AFINN review sentiment + FP-Growth buying patterns for
 * this shop only.
 */
export default function SellerInsightsScreen() {
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader
        role="seller"
        title="Customer Insights"
        subtitle="What customers say and buy together"
      />
      <InsightsView scope="seller" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7F5' },
});
