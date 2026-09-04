import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function CustomerDiscoverScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          Discover
        </Text>

        <Text style={styles.subtitle}>
          Customer Discover Screen
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#403A40',
  },

  subtitle: {
    marginTop: 8,
    fontSize: 13,
    color: '#999196',
  },
});