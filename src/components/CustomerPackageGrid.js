import React, { useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { Button, Input, Modal, Row, Col, Checkbox } from "antd";
import { db } from "@/app/firebase/config";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth } from "@/app/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import styles from "./PackageGrid.module.css";
import FeedbackButtonRenderer from "./FeedbackButtonRenderer";
import TrackButtonRenderer from "./TrackButtonRenderer";
import {
  GoogleMap,
  LoadScript,
  Polyline,
  Marker,
} from "@react-google-maps/api";

const CustomerPackagesGrid = () => {
  const [rowData, setRowData] = useState([]);
  const [user, setUser] = useState(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [isSatisfied, setIsSatisfied] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [userRole, setRole] = useState(null);
  const [cityState, setCityState] = useState(null);
  const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY;

  const handleFeedbackClick = (packageData) => {
    setSelectedPackage(packageData);
    setIsFeedbackModalOpen(true);
  };

  const columns = [
    {
      headerName: "Package Name",
      field: "name",
      flex: 1,
      sortable: true,
      filter: true,
      minWidth: 100,
      maxWidth: 300,
    },
    {
      headerName: "Tracking Number",
      field: "trackingNumber",
      flex: 1,
      sortable: true,
      filter: true,
      minWidth: 100,
      maxWidth: 300,
    },
    {
      headerName: "Description",
      field: "description",
      flex: 1,
      sortable: true,
      filter: true,
      minWidth: 100,
      maxWidth: 300,
    },
    {
      headerName: "Status",
      field: "status",
      flex: 1,
      sortable: true,
      filter: true,
      minWidth: 100,
      maxWidth: 300,
    },
    {
      headerName: "Package Weight",
      field: "packageWeight",
      flex: 1,
      sortable: true,
      filter: true,
      minWidth: 100,
      maxWidth: 300,
    },
    {
      headerName: "Package Dimensions",
      field: "packageDimensions",
      flex: 1,
      sortable: true,
      filter: true,
      minWidth: 100,
      maxWidth: 300,
    },
    {
      headerName: "Ship Date",
      field: "shipDate",
      flex: 1,
      sortable: true,
      filter: true,
      minWidth: 100,
      maxWidth: 300,
      cellRenderer: (params) =>
        params.value
          ? new Date(params.value.seconds * 1000).toLocaleDateString()
          : "N/A",
    },
    {
      headerName: "Expected Delivery Date",
      field: "deliveryDate",
      flex: 1,
      sortable: true,
      filter: true,
      minWidth: 100,
      maxWidth: 300,
      cellRenderer: (params) =>
        params.value
          ? new Date(params.value.seconds * 1000).toLocaleDateString()
          : "N/A",
    },
    {
      headerName: "Give Feedback",
      field: "feedback",
      cellRenderer: (params) => (
        <FeedbackButtonRenderer
          data={params.data}
          onFeedback={handleFeedbackClick}
        />
      ),
      minWidth: 150,
      maxWidth: 200,
      sortable: false,
      filter: false,
    },
    {
      headerName: "Actions",
      field: "location",
      cellRenderer: (params) => (
        <div onClick={() => viewLocation(params.data)}>
          <TrackButtonRenderer userRole={userRole} />
        </div>
      ),
      minWidth: 150,
      maxWidth: 200,
      sortable: false,
      filter: false,
    },
  ];

  const viewLocation = async (rowData) => {
    try {
      const packageDocRef = doc(db, "packages", rowData.id);
      const packageDocSnap = await getDoc(packageDocRef);

      if (packageDocSnap.exists()) {
        const location = packageDocSnap.data().location;

        const cityStatePromises = location.map((loc) =>
          getCityState(loc.geopoint?.latitude, loc.geopoint?.longitude)
        );

        Promise.all(cityStatePromises)
          .then((cityStateArray) => {
            const locationDataWithCityState = location.map((loc, index) => ({
              ...loc,
              cityState: cityStateArray[index],
            }));
            setLocationData(locationDataWithCityState);
          })
          .catch((error) => {
            console.error("Error fetching city and state information:", error);
            setLocationData(null);
          });

        setIsLocationModalOpen(true);
      } else {
        console.log("Package document does not exist");
      }
    } catch (error) {
      console.error("Error fetching location data:", error);
    }
  };

  useEffect(() => {
    if (locationData) {
      locationData.forEach((location) => {
        getCityState(location.geopoint?.latitude, location.geopoint?.longitude);
      });
    }
  }, [locationData]);

  function getCityState(lat, lng) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

    return fetch(url)
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "OK") {
          const components = data.results[0].address_components;
          const city = components.find((component) =>
            component.types.includes("locality")
          );

          const state = components.find((component) =>
            component.types.includes("administrative_area_level_1")
          );

          if (city && state) {
            return `${city.long_name}, ${state.short_name}`;
          } else {
            return null;
          }
        } else {
          console.error("Unable to retrieve city and state information.");
          return null;
        }
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        return null;
      });
  }

  const fetchRole = async (userId) => {
    const uid = userId.uid;
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      setRole(userDoc.data().role);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchRole(currentUser);
        fetchTrackedPackages(currentUser.uid);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchTrackedPackages = async (userId) => {
    if (!userId) return;
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists() && userDoc.data().trackedPackages) {
      const trackedPackages = userDoc.data().trackedPackages;
      const packageQueries = trackedPackages.map((trackingNumber) =>
        query(
          collection(db, "packages"),
          where("trackingNumber", "==", trackingNumber)
        )
      );
      const packageDocs = await Promise.all(packageQueries.map(getDocs));
      const packagesData = packageDocs.flatMap((snapshot) =>
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      setRowData(packagesData);
    } else {
      console.log("No packages tracked");
      setRowData([]);
    }
  };

  const trackPackage = async () => {
    if (!user) return;
    const q = query(
      collection(db, "packages"),
      where("trackingNumber", "==", trackingNumber)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      Modal.error({
        title: "Invalid Tracking Number",
        content: "No package associated with this tracking number.",
      });
    } else {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        trackedPackages: arrayUnion(trackingNumber),
      });

      fetchTrackedPackages(user.uid); // Refresh package grid to show the newly tracked package
      Modal.success({
        title: "Package Found",
        content: "The package has been added to your grid.",
      });
    }
    setIsTrackingModalOpen(false);
    setTrackingNumber("");
  };

  const handleSearch = (value) => {
    setSearchValue(value);
    if (value) {
      const filtered = rowData.filter((row) => {
        return Object.keys(row).some((field) => {
          // Check if the field is not null or undefined before calling toString
          return (
            row[field] !== null &&
            row[field] !== undefined &&
            row[field].toString().toLowerCase().includes(value.toLowerCase())
          );
        });
      });
      setFilteredData(filtered);
    } else {
      setFilteredData(rowData);
    }
  };

  useEffect(() => {
    setFilteredData(rowData);
  }, [rowData]);

  const submitFeedback = async () => {
    if (!selectedPackage) return;

    const feedbackRef = doc(collection(db, "Feedback"));
    await setDoc(feedbackRef, {
      customerId: user.uid,
      packageId: selectedPackage.id,
      description: feedbackDescription,
      satisfied: isSatisfied,
      createdAt: serverTimestamp(),
      driverId: selectedPackage.assignedDriverId,
      adminId: selectedPackage.adminId,
    });

    // Set isFeedback to true in the selectedPackage object
    const updatedSelectedPackage = { ...selectedPackage, isFeedback: true };

    // Update the Firestore document with the new isFeedback value
    const packageDocRef = doc(db, "packages", selectedPackage.id);
    await updateDoc(packageDocRef, { isFeedback: true });

    setIsFeedbackModalOpen(false);
    setFeedbackDescription("");
    setIsSatisfied(false);
    fetchTrackedPackages(user.uid);
  };

  const handleSatisfactionChange = (e) => {
    setIsSatisfied(e.target.checked);
  };

  return (
    <div className={`ag-theme-alpine ${styles.gridContainer}`}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Input.Search
            placeholder="Search packages..."
            onSearch={handleSearch}
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </Col>
        <Col>
          <Button
            className={styles.actionButton}
            type="primary"
            onClick={() => setIsTrackingModalOpen(true)}
          >
            Track Package
          </Button>
        </Col>
      </Row>
      <AgGridReact
        rowData={filteredData}
        columnDefs={columns}
        domLayout="autoHeight"
        rowHeight={40}
        frameworkComponents={{
          feedbackButtonRenderer: FeedbackButtonRenderer, // Registering the renderer
        }}
        style={{ borderRadius: "10px", overflow: "hidden" }}
      />

      <Modal
        title="Track a Package"
        open={isTrackingModalOpen}
        onOk={trackPackage}
        onCancel={() => setIsTrackingModalOpen(false)}
        okText="Track"
        cancelText="Cancel"
      >
        <Input
          placeholder="Enter tracking number"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
        />
      </Modal>

      <Modal
        title="Give Feedback on Package"
        open={isFeedbackModalOpen}
        onOk={submitFeedback}
        onCancel={() => setIsFeedbackModalOpen(false)}
      >
        <Input.TextArea
          rows={4}
          value={feedbackDescription}
          onChange={(e) => setFeedbackDescription(e.target.value)}
          placeholder="Describe your experience..."
        />
        <Checkbox checked={isSatisfied} onChange={handleSatisfactionChange}>
          Are you satisfied with the package?
        </Checkbox>
      </Modal>
      <Modal
        title={
          <div
            style={{
              backgroundColor: "#154734",
              color: "white",
              padding: "10px 15px",
              borderRadius: "15px",
            }}
          >
            TRACKING PACKAGE
          </div>
        }
        open={isLocationModalOpen}
        onCancel={() => setIsLocationModalOpen(false)}
        footer={null}
        width={800} // Adjust width to fit the map
        closeIcon={
          <span
            style={{
              backgroundColor: "white",
              borderRadius: "2%",
              position: "relative",
              top: "13px",
              borderRadius: "12px",
              padding: "1px 13.5px",
              right: "20px",
            }}
          >
            X
          </span>
        }
      >
        {locationData && (
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <ul>
                {locationData.map((location, index) => (
                  <li key={index}>
                    <strong>
                      Timestamp: {new Date(location.timeStamp).toLocaleString()}
                    </strong>
                    <p>
                      Latitude: {location.geopoint.latitude.toFixed(7)},
                      Longitude: {location.geopoint.longitude.toFixed(7)}
                    </p>
                    {location.cityState && (
                      <p>City, State: {location.cityState}</p>
                    )}
                    <p>Status: {location.status}</p>
                  </li>
                ))}
              </ul>
            </Col>
            <Col span={12}>
              <LoadScript googleMapsApiKey={apiKey}>
                <div style={{ borderRadius: "10px", overflow: "hidden" }}>
                  <GoogleMap
                    mapContainerStyle={{ width: "100%", height: "400px" }}
                    center={
                      locationData.length > 0
                        ? {
                            lat: locationData[locationData.length - 1].geopoint
                              .latitude,
                            lng: locationData[locationData.length - 1].geopoint
                              .longitude,
                          }
                        : { lat: 0, lng: 0 }
                    }
                    zoom={10}
                  >
                    <Polyline
                      path={locationData.map((loc) => ({
                        lat: loc.geopoint.latitude,
                        lng: loc.geopoint.longitude,
                      }))}
                      options={{
                        strokeColor: "#FF0000",
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                        fillColor: "#FF0000",
                        fillOpacity: 0.35,
                      }}
                    />
                    {locationData && (
                      <Marker
                        position={{
                          lat: locationData[locationData.length - 1].geopoint
                            .latitude,
                          lng: locationData[locationData.length - 1].geopoint
                            .longitude,
                        }}
                      />
                    )}
                  </GoogleMap>
                </div>
              </LoadScript>
            </Col>
          </Row>
        )}
      </Modal>
    </div>
  );
};

export default CustomerPackagesGrid;
