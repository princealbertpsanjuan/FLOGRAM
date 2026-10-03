import { StatusBar, StyleSheet, View } from 'react-native';

import InsightsView from '../../components/analytics/insights-view';
import ScreenHeader from '../../components/ui/screen-header';

/*
 * Admin → Customer Insights
 * AFINN review sentiment + FP-Growth buying patterns
 * across all shops.
 */
export default function AdminInsightsScreen() {
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader
        role="admin"
        title="Customer Insights"
        subtitle="Review sentiment and buying patterns"
      />
      <InsightsView scope="admin" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F8' },
});
