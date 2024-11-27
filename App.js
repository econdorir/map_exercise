import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Button, TouchableOpacity, ScrollView } from "react-native";
import * as Location from "expo-location"; // Importing the expo-location package
import MapView, { Marker } from "react-native-maps"; // Importing MapView and Marker
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// HomeScreen Component
const HomeScreen = ({ navigation }) => {
  const [taxisData, setTaxisData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [nearestTaxis, setNearestTaxis] = useState([]);
  const [selectedTaxi, setSelectedTaxi] = useState(null); // Holds the selected taxi to display on the map

  // Fetch taxis data
  const fetchTaxisData = async () => {
    try {
      const response = await fetch("https://clasespersonales.com/taxis/");
      const html = await response.text();

      const taxis = [];
      const rows = html.split("<tr>");

      for (let i = 1; i < rows.length; i++) {
        let row = rows[i];
        if (!row.trim()) continue;

        row = row
          .replace(/&nbsp;/g, " ")
          .replace(/<\/?[^>]+(>|$)/g, "")
          .trim();

        const matches = row.match(
          /(\d+)\s*(\d+)\s*(-?\d+\.\d+)\s*(-?\d+\.\d+)/
        );
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
      console.error("Error fetching taxi data:", error);
      setLoading(false);
    }
  };

  // Function to get the user's location
  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location.coords);
      } else {
        setLocationError("Permission to access location was denied");
      }
    } catch (error) {
      setLocationError("Error fetching location");
      console.error(error);
    }
  };

  // Haversine formula to calculate distance
  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  };

  // Function to find nearest taxis
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

      const sortedTaxis = distances
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);
      setNearestTaxis(sortedTaxis.map((item) => item.taxi));
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
          <Text style={styles.title}>CODIGO - 326</Text>
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
            <TouchableOpacity
              key={index}
              style={styles.card}
              onPress={() => navigation.navigate('MapScreen', { selectedTaxi: taxi, userLocation })}
            >
              <Text style={styles.title}>MÓVIL: {taxi.movil}</Text>
              <Text style={styles.info}>LATITUD: {taxi.latitud}</Text>
              <Text style={styles.info}>LONGITUD: {taxi.longitud}</Text>
              <Text style={styles.info}>
                Distance:{" "}
                {haversineDistance(
                  userLocation.latitude,
                  userLocation.longitude,
                  taxi.latitud,
                  taxi.longitud
                ).toFixed(2)}{" "}
                km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// MapScreen Component
const MapScreen = ({ route, navigation }) => {
  const { selectedTaxi, userLocation } = route.params;

  return (
    <View style={styles.container}>
      <Button title="Go Back" onPress={() => navigation.goBack()} />

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        region={{
          latitude: selectedTaxi.latitud,
          longitude: selectedTaxi.longitud,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        <Marker
          coordinate={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          }}
          title="Your Location"
          description="You are here"
        />
        <Marker
          coordinate={{
            latitude: selectedTaxi.latitud,
            longitude: selectedTaxi.longitud,
          }}
          title="Taxi Location"
          description={`Taxi Movil: ${selectedTaxi.movil}`}
        />
      </MapView>
    </View>
  );
};

// StackNavigator setup
const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="MapScreen" component={MapScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  card: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  info: {
    fontSize: 16,
    marginTop: 5,
  },
  locationContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#e0f7fa",
    borderRadius: 8,
  },
  nearestTaxisContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f1f8e9",
    borderRadius: 8,
  },
  map: {
    height: 400,
    marginTop: 20,
  },
});

export default App;
