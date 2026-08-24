import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Alert, SafeAreaView, ActivityIndicator, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://task.paisaloots.site';

export default function App() {
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [balance, setBalance] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    const savedToken = await AsyncStorage.getItem('user_token');
    if (savedToken) {
      setToken(savedToken);
      fetchDashboard(savedToken);
    }
  };

  const sendOtp = async () => {
    if (!email) return Alert.alert('Error', 'Please enter email');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setOtpSent(true);
        Alert.alert('Success', 'OTP sent to your email!');
      } else {
        Alert.alert('Error', data.message || 'Failed to send OTP');
      }
    } catch {
      Alert.alert('Error', 'Server connection error');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp) return Alert.alert('Error', 'Please enter OTP');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (data.status === 'success') {
        await AsyncStorage.setItem('user_token', data.token);
        setToken(data.token);
        fetchDashboard(data.token);
      } else {
        Alert.alert('Error', data.message || 'Invalid OTP');
      }
    } catch {
      Alert.alert('Error', 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async (authToken) => {
    setLoading(true);
    try {
      const [profileRes, taskRes] = await Promise.all([
        fetch(`${API_BASE}/api/user/profile`, { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch(`${API_BASE}/api/tasks`)
      ]);
      const profileData = await profileRes.json();
      const taskData = await taskRes.json();

      setBalance(profileData.coin_balance || 0);
      setTasks(taskData.tasks || []);
    } catch {
      Alert.alert('Error', 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const startTask = async (taskId) => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ task_id: taskId })
      });
      const data = await res.json();
      if (data.tracking_link) {
        Linking.openURL(data.tracking_link);
      } else {
        Alert.alert('Error', data.error || 'Failed to generate link');
      }
    } catch {
      Alert.alert('Error', 'Task redirection failed');
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('user_token');
    setToken(null);
    setOtpSent(false);
    setEmail('');
    setOtp('');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ff6b00" />
      </View>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.headerTitle}>Paisa Loots</Text>
          <Text style={styles.subTitle}>Login / Register with OTP</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          {otpSent && (
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit OTP"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
            />
          )}

          <TouchableOpacity style={styles.primaryBtn} onPress={otpSent ? verifyOtp : sendOtp}>
            <Text style={styles.primaryBtnText}>{otpSent ? 'Verify OTP' : 'Send OTP'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.dashHeader}>
        <View>
          <Text style={styles.walletLabel}>Coin Balance</Text>
          <Text style={styles.walletValue}>🪙 {balance}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <View style={styles.taskCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskTitle}>{item.title}</Text>
              <Text style={styles.taskCategory}>{item.category} • +{item.reward_coins} Coins</Text>
            </View>
            <TouchableOpacity style={styles.startBtn} onPress={() => startTask(item.id)}>
              <Text style={styles.startBtnText}>Start</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 24, margin: 20, backgroundColor: '#fff', borderRadius: 12, elevation: 4 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#ff6b00', textAlign: 'center' },
  subTitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 16 },
  primaryBtn: { backgroundColor: '#ff6b00', padding: 14, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  dashHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
  walletLabel: { fontSize: 12, color: '#888' },
  walletValue: { fontSize: 22, fontWeight: 'bold', color: '#222' },
  logoutBtn: { padding: 8, backgroundColor: '#eee', borderRadius: 6 },
  logoutBtnText: { color: '#333', fontSize: 12, fontWeight: 'bold' },
  listContainer: { padding: 16 },
  taskCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 12, elevation: 2 },
  taskTitle: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  taskCategory: { fontSize: 13, color: '#ff6b00', marginTop: 4 },
  startBtn: { backgroundColor: '#10b981', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  startBtnText: { color: '#fff', fontWeight: 'bold' }
});
  
