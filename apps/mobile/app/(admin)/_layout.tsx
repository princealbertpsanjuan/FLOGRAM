import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

import AdminWebSidebar from "../../components/admin/admin-web-sidebar";
import { useDesktopWeb } from "../../hooks/use-desktop-web";

/*
 * Phone and narrow windows: plain stack with the bottom
 * navigation on each tab screen.
 *
 * Desktop browsers (web portal): left sidebar + the page
 * on the right, centered at a readable width.
 */
export default function AdminLayout() {
  const desktop = useDesktopWeb();

  const stack = (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );

  if (!desktop) {
    return stack;
  }

  return (
    <View style={styles.row}>
      <AdminWebSidebar />
      <View style={styles.main}>
        <View style={styles.page}>{stack}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#EEEEF4",
  },
  main: {
    flex: 1,
    alignItems: "center",
  },
  page: {
    flex: 1,
    width: "100%",
    maxWidth: 1240,
    backgroundColor: "#F5F5F8",
  },
});
