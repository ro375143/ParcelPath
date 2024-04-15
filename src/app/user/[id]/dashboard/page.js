"use client";
// UserDashboard.js
import React, { useEffect, useState } from "react";
import { auth, db } from "@/app/firebase/config"; // Adjust the import path accordingly
import { doc, getDoc } from "firebase/firestore"; // Import doc() and getDoc() functions
import CustomerPackagesGrid from "@/components/CustomerPackageGrid";
import styles from "@/app/page.module.css";

const UserDashboard = () => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        // Fetch user role from Firestore directly by referencing the user's document
        const userDocRef = doc(db, "users", user.uid); // Create reference to user document
        getDoc(userDocRef)
          .then((doc) => {
            if (doc.exists() && doc.data().role === "customer") {
              setUserRole("customer");
            }
          })
          .catch((error) => {
            console.error("Error getting user document:", error);
          });
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    document.title = "Customer Dashboard";
  }, []);

  if (!user || userRole !== "customer") {
    // Render message in the center of the screen
    return (
      <div className={styles.centeredMessage}>
        <p>You must be an authenticated customer to access this page!</p>
      </div>
    );
  }

  return (
    <>
      <h1
        className={styles.pageTitle}
        style={{
          border: "2px solid #154734",
          borderRadius: "10px",
          padding: "10px",
          width: "1000px",
          marginTop: "50px",
          marginLeft: "auto",
          marginBottom: "1px",
          marginRight: "auto",
          backgroundColor: "#154734",
          color: "white", // Adjust the value as needed for a bigger top margin
        }}
      >
        Customer Dashboard
      </h1>
      <div className={styles.dashboardContainer}>
        <CustomerPackagesGrid />
      </div>
    </>
  );
};

export default UserDashboard;
