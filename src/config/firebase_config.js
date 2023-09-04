import { initializeApp } from "firebase/app";
import { arrayUnion, getFirestore, query, where } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth"
import {
  addDoc,
  serverTimestamp,
  collection,
  doc,
  deleteDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { v4 } from "uuid";
import { useEffect, useState } from "react";
import { environment } from "./environment";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API,
  authDomain: "sparkdeals-a9107.firebaseapp.com",
  projectId: "sparkdeals-a9107",
  storageBucket: "sparkdeals-a9107.appspot.com",
  messagingSenderId: "697702771938",
  appId: "1:697702771938:web:054736840b4fcb19af42bb",
  measurementId: "G-RJ866G4KDV",
};

const firebaseTestConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_TEST,
  authDomain: "sparkdealstest.firebaseapp.com",
  projectId: "sparkdealstest",
  storageBucket: "sparkdealstest.appspot.com",
  messagingSenderId: "753257719948",
  appId: "1:753257719948:web:df98018f7e900f503073a9",
  measurementId: "G-F5HZN2FWCT"
}
// const appConfig = environment === "test" ? firebaseTestConfig : environment === "production" ? firebaseConfig : null;

// if (!appConfig) {
//     throw new Error("Invalid environment or missing Firebase configuration.");
// }

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);
export const auth = getAuth(app)

export const handleDeleteDoc = async (documentId) => {
  try {
    const documentRef = doc(db, "deals", documentId);
    await deleteDoc(documentRef);
    return true;
  } catch (error) {
    return
  }
};

export const handleFile = (image) => {
  return new Promise((resolve, reject) => {
    if (image == null) {
      reject("No image to upload");
      return;
    }
    const imageRef = ref(storage, `/images/${image.name + v4()}`);
    uploadBytes(imageRef, image)
      .then(() => {
        getDownloadURL(imageRef)
          .then((downloadURL) => {
            resolve(downloadURL);
          })
          .catch((error) => {
            reject(error);
          });
      })
      .catch((error) => {
        reject(error);
      });
  });
};

export const handleSubmit = async (
  productName,
  oldPrice,
  expiryDate,
  startDate,
  newPrice,
  quantity,
  unit,
  discount,
  image,
  deliveredAt,
  paidAt,
  couponCode
) => {
  try {
    const imageURL = await handleFile(image);
    const collectionRef = collection(db, "deals");
    await addDoc(collectionRef, {
      imageURL,
      productName,
      oldPrice,
      expiryDate,
      startDate,
      currentPrice: newPrice,
      availableQTY: quantity,
      measurement: unit,
      discount,
      createdAt: serverTimestamp(),
      paidAt,
      deliveredAt,
    });


    return true;
  } catch (error) {
    
    return false;
  }
};

export const createCouponHandler = async (
  holderName,
  discountPercent,
  couponCode,
  couponUsage,
) => {
  try {

    const collectionRef = collection(db, "coupons");
    await addDoc(collectionRef, {
      holderName,
      discountPercent,
      couponCode,
      couponUsage,
      createdAt: serverTimestamp(),

    });
    return true; // Return true after the document is added successfully
  } catch (error) {
  
    return false; // Return false in case of an error
  }
};

export const handleProcessingOrder = async (newOrder) => {
  try {
    const collectionRef = collection(db, "orders");
    const orderDocRef = await addDoc(collectionRef, newOrder);

    if (newOrder.couponCode) {
      // If a couponCode is used in the order
      const couponRef = collection(db, "coupons");
      const querySnapshot = await getDocs(
        query(couponRef, where("couponCode", "==", newOrder.couponCode))
      );

      if (!querySnapshot.empty) {
        // If a matching coupon is found
        const couponDoc = querySnapshot.docs[0];
        const couponDocId = couponDoc.id;

        // Update the couponUsage list
        await updateDoc(doc(couponRef, couponDocId), {
          couponUsage: arrayUnion(orderDocRef.id),
        });
      }
    }

    return true;
  } catch (error) {
    
    return false;
  }
};

export const handlePaymentUpdate = async (orderId) => {
  try {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, {
      paid: true,
      paidAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    return error;
  }
};

export const handleDeliveryUpdate = async (orderId) => {
  try {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, {
      delivered: true,
      deliveredAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    return error;
  }
};

export const useFetchData = (trigger, collectionName) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const dataRef = collection(db, collectionName);
      const querySnapshot = await getDocs(dataRef);
      const documents = [];
      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      setData(documents);
    };
    fetchData();
  }, [trigger, collectionName]);

  return data;
};
