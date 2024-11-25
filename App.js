import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Button } from 'react-native';
import * as Location from 'expo-location'; // Importing the expo-location package

export default function App() {
  const [taxisData, setTaxisData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [nearestTaxis, setNearestTaxis] = useState([]);

  // Function to fetch HTML data and parse it
  const fetchTaxisData = async () => {
    try {
      const response = await fetch('https://clasespersonales.com/taxis/');
      const html = await response.text(); // Get the raw HTML as text

      const taxis = [];
      const rows = html.split('<tr>');

      for (let i = 1; i < rows.length; i++) {
        let row = rows[i];
        if (!row.trim()) continue;

        // Clean up HTML tags and entities like &nbsp;
        row = row.replace(/&nbsp;/g, ' ').replace(/<\/?[^>]+(>|$)/g, '').trim();

        const matches = row.match(/(\d+)\s*(\d+)\s*(-?\d+\.\d+)\s*(-?\d+\.\d+)/);
        if (matches) {
          taxis.push({
            movil: matches[1],
            carnet: matches[2],
            latitud: parseFloat(matches[3]),
            longitud: parseFloat(matches[4]),
          });
        }
      }

      setTaxisData(taxis);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching taxi data:', error);
      setLoading(false);
    }
  };

  // Function to get the user's current location
  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        // Fetch user's current location
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location.coords); // Save latitude and longitude in state
      } else {
        setLocationError('Permission to access location was denied');
      }
    } catch (error) {
      setLocationError('Error fetching location');
      console.error(error);
    }
  };

  // Haversine formula to calculate distance between two coordinates
  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180); // Convert degrees to radians
    const dLon = (lon2 - lon1) * (Math.PI / 180); // Convert degrees to radians
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  };

  // Function to calculate the 3 nearest taxis
  const findNearestTaxis = () => {
    if (userLocation) {
      const distances = taxisData.map((taxi) => {
        const distance = haversineDistance(
          userLocation.latitude,
          userLocation.longitude,
          taxi.latitud,
          taxi.longitud
        );
        return { taxi, distance };
      });

      // Sort taxis by distance and get the top 3
      const sortedTaxis = distances.sort((a, b) => a.distance - b.distance).slice(0, 3);

      setNearestTaxis(sortedTaxis.map(item => item.taxi));
    }
  };

  // Fetch data when the component mounts
  useEffect(() => {
    fetchTaxisData();
  }, []);

  return (
    <View style={styles.container}>
      {loading ? (
        <Text>Loading taxi data...</Text>
      ) : (
        <ScrollView>
          {taxisData.length > 0 ? (
            taxisData.map((taxi, index) => (
              <View key={index} style={styles.card}>
                <Text style={styles.title}>MÓVIL: {taxi.movil}</Text>
                <Text style={styles.info}>CARNET: {taxi.carnet}</Text>
                <Text style={styles.info}>LATITUD: {taxi.latitud}</Text>
                <Text style={styles.info}>LONGITUD: {taxi.longitud}</Text>
              </View>
            ))
          ) : (
            <Text>No data found</Text>
          )}
        </ScrollView>
      )}

      <Button title="Get My Location" onPress={getUserLocation} />
      <Button title="Find Nearest Taxis" onPress={findNearestTaxis} />

      {userLocation ? (
        <View style={styles.locationContainer}>
          <Text>Your Location:</Text>
          <Text>Latitude: {userLocation.latitude}</Text>
          <Text>Longitude: {userLocation.longitude}</Text>
        </View>
      ) : locationError ? (
        <Text>{locationError}</Text>
      ) : (
        <Text>Location not yet fetched</Text>
      )}

      {nearestTaxis.length > 0 && (
        <View style={styles.nearestTaxisContainer}>
          <Text style={styles.title}>Nearest Taxis:</Text>
          {nearestTaxis.map((taxi, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.title}>MÓVIL: {taxi.movil}</Text>
              <Text style={styles.info}>LATITUD: {taxi.latitud}</Text>
              <Text style={styles.info}>LONGITUD: {taxi.longitud}</Text>
              <Text style={styles.info}>Distance: {haversineDistance(userLocation.latitude, userLocation.longitude, taxi.latitud, taxi.longitud).toFixed(2)} km</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  card: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  info: {
    fontSize: 16,
    marginTop: 5,
  },
  locationContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#e0f7fa',
    borderRadius: 8,
  },
  nearestTaxisContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f1f8e9',
    borderRadius: 8,
  },
});
